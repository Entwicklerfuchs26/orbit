package space.sternenhof.wallpaper;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.SurfaceTexture;
import android.media.MediaPlayer;
import android.opengl.GLES11Ext;
import android.opengl.GLES20;
import android.opengl.GLUtils;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.SystemClock;
import android.service.wallpaper.WallpaperService;
import android.view.Surface;
import android.view.SurfaceHolder;

import androidx.core.content.ContextCompat;

import java.io.File;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.FloatBuffer;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.CountDownLatch;

/**
 * OpenGL ES 2.0 live wallpaper. Renders the app's wallpaper as the OS background
 * and animates changes with the SAME shader transitions as the web app
 * (ported in {@link GlShaders}). Supports single image, native rotation pool,
 * and looping video (via SurfaceTexture). Canvas rendering was replaced by GL so
 * the fancy GPU transitions run on the home screen too.
 */
public class SkwdWallpaperService extends WallpaperService {

    public static final String PREFS = "skwd_live";
    public static final String KEY_MODE = "mode";          // "single" | "rotate"
    public static final String KEY_PATH = "path";
    public static final String KEY_KIND = "kind";          // "image" | "video"
    public static final String KEY_POOL_COUNT = "pool_count";
    public static final String KEY_INTERVAL = "interval_ms";
    public static final String KEY_RANDOM = "pool_random";
    public static final String KEY_TRANSITION = "transition";
    public static final String KEY_TRANSITION_MS = "transition_ms";
    public static final String ACTION_UPDATE = "space.sternenhof.wallpaper.LIVE_UPDATE";

    @Override
    public Engine onCreateEngine() {
        return new GLEngine();
    }

    private class GLEngine extends Engine {
        private HandlerThread glThread;
        private Handler gl;
        private EglCore egl;
        private final Random random = new Random();

        // GL objects
        private int imageProgram;                       // single-texture passthrough
        private int oesProgram;                         // video (external texture)
        private final Map<String, Integer> transPrograms = new HashMap<>();
        private FloatBuffer quad;
        private int texA, texB;                         // ping-pong image textures
        private int showTex;                            // currently displayed image texture
        private int videoTex;                           // external OES texture

        // display state
        private int surfaceW, surfaceH;
        private boolean haveImage = false;
        private float[] curScale = {1f, 1f};
        private int curW, curH;

        // transition state
        private boolean animating = false;
        private long animStart = 0;
        private long transMs = 600;
        private String transitionType = "fade";
        private int fromTex;
        private int toTex;
        private float[] fromScale = {1f, 1f};
        private float[] toScale = {1f, 1f};

        // rotation
        private boolean rotating = false;
        private int poolCount = 0, poolIdx = 0;
        private long intervalMs = 300000;
        private boolean randomOrder = false;

        // video
        private boolean isVideo = false;
        private MediaPlayer player;
        private SurfaceTexture videoSurfaceTexture;
        private final float[] stMatrix = new float[16];

        private boolean visible = false;

        private final BroadcastReceiver updateReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                post(() -> loadFromPrefs());
            }
        };

        private final Runnable drawTick = this::onDrawTick;
        private final Runnable rotateTick = this::onRotateTick;

        private void post(Runnable r) {
            if (gl != null) gl.post(r);
        }

        @Override
        public void onCreate(SurfaceHolder holder) {
            super.onCreate(holder);
            ContextCompat.registerReceiver(
                SkwdWallpaperService.this, updateReceiver,
                new IntentFilter(ACTION_UPDATE), ContextCompat.RECEIVER_NOT_EXPORTED);
        }

        @Override
        public void onSurfaceCreated(SurfaceHolder holder) {
            super.onSurfaceCreated(holder);
            glThread = new HandlerThread("skwd-gl");
            glThread.start();
            gl = new Handler(glThread.getLooper());
            final Surface sfc = holder.getSurface();
            post(() -> {
                egl = new EglCore(sfc);
                if (!egl.valid()) return;
                initGL();
                loadFromPrefs();
            });
        }

        @Override
        public void onSurfaceChanged(SurfaceHolder holder, int format, int width, int height) {
            super.onSurfaceChanged(holder, format, width, height);
            post(() -> {
                surfaceW = width;
                surfaceH = height;
                if (egl != null) egl.makeCurrent();
                GLES20.glViewport(0, 0, width, height);
                recomputeScales();
                if (!isVideo) drawStatic();
            });
        }

        @Override
        public void onSurfaceDestroyed(SurfaceHolder holder) {
            super.onSurfaceDestroyed(holder);
            final CountDownLatch latch = new CountDownLatch(1);
            post(() -> {
                releaseGL();
                latch.countDown();
            });
            try { latch.await(); } catch (InterruptedException ignored) {}
            if (glThread != null) {
                glThread.quitSafely();
                glThread = null;
                gl = null;
            }
        }

        @Override
        public void onVisibilityChanged(boolean vis) {
            visible = vis;
            post(() -> {
                if (vis) {
                    if (player != null) player.start();
                    if (rotating) {
                        gl.removeCallbacks(rotateTick);
                        gl.postDelayed(rotateTick, intervalMs);
                        drawStatic();
                    } else {
                        loadFromPrefs();
                    }
                } else {
                    if (gl != null) gl.removeCallbacks(rotateTick);
                    if (player != null && player.isPlaying()) player.pause();
                }
            });
        }

        @Override
        public void onDestroy() {
            super.onDestroy();
            try { unregisterReceiver(updateReceiver); } catch (Exception ignored) {}
        }

        // ---- GL setup ----
        private void initGL() {
            imageProgram = buildProgram(GlShaders.VERT, GlShaders.FRAG_IMAGE);
            float[] verts = { -1f, -1f, 1f, -1f, -1f, 1f, 1f, 1f };
            quad = ByteBuffer.allocateDirect(verts.length * 4)
                .order(ByteOrder.nativeOrder()).asFloatBuffer();
            quad.put(verts).position(0);
            int[] t = new int[2];
            GLES20.glGenTextures(2, t, 0);
            texA = t[0];
            texB = t[1];
            showTex = texA;
            GLES20.glClearColor(0f, 0f, 0f, 1f);
        }

        private int transitionProgram(String name) {
            Integer p = transPrograms.get(name);
            if (p != null) return p;
            int prog = buildProgram(GlShaders.VERT, GlShaders.fragmentFor(GlShaders.bodyOr(name)));
            if (prog == 0) prog = buildProgram(GlShaders.VERT, GlShaders.fragmentFor(GlShaders.bodyOr("fade")));
            transPrograms.put(name, prog);
            return prog;
        }

        private int buildProgram(String vs, String fs) {
            int v = compile(GLES20.GL_VERTEX_SHADER, vs);
            int f = compile(GLES20.GL_FRAGMENT_SHADER, fs);
            if (v == 0 || f == 0) return 0;
            int prog = GLES20.glCreateProgram();
            GLES20.glAttachShader(prog, v);
            GLES20.glAttachShader(prog, f);
            GLES20.glLinkProgram(prog);
            int[] ok = new int[1];
            GLES20.glGetProgramiv(prog, GLES20.GL_LINK_STATUS, ok, 0);
            if (ok[0] == 0) {
                GLES20.glDeleteProgram(prog);
                return 0;
            }
            return prog;
        }

        private int compile(int type, String src) {
            int sh = GLES20.glCreateShader(type);
            GLES20.glShaderSource(sh, src);
            GLES20.glCompileShader(sh);
            int[] ok = new int[1];
            GLES20.glGetShaderiv(sh, GLES20.GL_COMPILE_STATUS, ok, 0);
            if (ok[0] == 0) {
                GLES20.glDeleteShader(sh);
                return 0;
            }
            return sh;
        }

        private void bindQuad(int program) {
            int aPos = GLES20.glGetAttribLocation(program, "aPos");
            GLES20.glEnableVertexAttribArray(aPos);
            quad.position(0);
            GLES20.glVertexAttribPointer(aPos, 2, GLES20.GL_FLOAT, false, 0, quad);
        }

        private float[] coverScale(int iw, int ih, int sw, int sh) {
            if (iw <= 0 || ih <= 0 || sw <= 0 || sh <= 0) return new float[]{1f, 1f};
            float ia = (float) iw / ih;
            float ca = (float) sw / sh;
            return ia > ca ? new float[]{ca / ia, 1f} : new float[]{1f, ia / ca};
        }

        private void recomputeScales() {
            curScale = coverScale(curW, curH, surfaceW, surfaceH);
        }

        // ---- Load media from prefs ----
        private void loadFromPrefs() {
            if (egl == null || !egl.valid()) return;
            egl.makeCurrent();
            SharedPreferences p = prefs();
            String mode = p.getString(KEY_MODE, "single");
            transitionType = p.getString(KEY_TRANSITION, "fade");
            transMs = Math.max(1, p.getLong(KEY_TRANSITION_MS, 600));
            if (gl != null) gl.removeCallbacks(rotateTick);
            rotating = false;

            if ("rotate".equals(mode)) {
                poolCount = p.getInt(KEY_POOL_COUNT, 0);
                intervalMs = Math.max(2000, p.getLong(KEY_INTERVAL, 300000));
                randomOrder = p.getBoolean(KEY_RANDOM, false);
                if (poolCount <= 0) return;
                releaseVideo();
                rotating = true;
                poolIdx = 0;
                showPoolImage(poolIdx);
                gl.postDelayed(rotateTick, intervalMs);
                return;
            }

            String path = p.getString(KEY_PATH, null);
            String kind = p.getString(KEY_KIND, "image");
            if (path == null) return;
            if ("video".equals(kind)) {
                startVideo(path);
            } else {
                releaseVideo();
                Bitmap bmp = BitmapFactory.decodeFile(path);
                if (bmp != null) setImage(bmp);
            }
        }

        private SharedPreferences prefs() {
            return getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        }

        private File poolFile(int i) {
            return new File(getApplicationContext().getFilesDir(), "live_pool/" + i + ".jpg");
        }

        private void onRotateTick() {
            if (poolCount <= 0) return;
            if (randomOrder && poolCount > 1) {
                int next;
                do { next = random.nextInt(poolCount); } while (next == poolIdx);
                poolIdx = next;
            } else {
                poolIdx = (poolIdx + 1) % poolCount;
            }
            showPoolImage(poolIdx);
            if (visible && rotating) gl.postDelayed(rotateTick, intervalMs);
        }

        private void showPoolImage(int i) {
            File f = poolFile(i);
            if (!f.exists()) return;
            Bitmap bmp = BitmapFactory.decodeFile(f.getAbsolutePath());
            if (bmp != null) setImage(bmp);
        }

        // ---- Image set + transition ----
        private void setImage(Bitmap bmp) {
            isVideo = false;
            int dest = (showTex == texA) ? texB : texA;
            uploadTexture(dest, bmp);
            int w = bmp.getWidth(), h = bmp.getHeight();
            bmp.recycle();

            if (!haveImage || "none".equals(transitionType)) {
                showTex = dest;
                curW = w; curH = h;
                recomputeScales();
                haveImage = true;
                drawStatic();
                return;
            }
            // start transition from current → new
            fromTex = showTex;
            toTex = dest;
            fromScale = curScale;
            toScale = coverScale(w, h, surfaceW, surfaceH);
            // stash new as pending current (committed when the fade finishes)
            curW = w; curH = h;
            animStart = SystemClock.uptimeMillis();
            animating = true;
            if (gl != null) gl.removeCallbacks(drawTick);
            post(drawTick);
        }

        private void uploadTexture(int tex, Bitmap bmp) {
            GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, tex);
            GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_MIN_FILTER, GLES20.GL_LINEAR);
            GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_MAG_FILTER, GLES20.GL_LINEAR);
            GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_WRAP_S, GLES20.GL_CLAMP_TO_EDGE);
            GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_WRAP_T, GLES20.GL_CLAMP_TO_EDGE);
            GLUtils.texImage2D(GLES20.GL_TEXTURE_2D, 0, bmp, 0);
        }

        private void onDrawTick() {
            if (!animating) { drawStatic(); return; }
            float t = Math.min(1f, (SystemClock.uptimeMillis() - animStart) / (float) transMs);
            drawTransition(t);
            if (t < 1f && visible) {
                gl.postDelayed(drawTick, 16);
            } else {
                // commit the new image as current
                showTex = toTex;
                curScale = toScale;
                animating = false;
                drawStatic();
            }
        }

        private void drawStatic() {
            if (egl == null || !egl.valid() || imageProgram == 0 || !haveImage) return;
            egl.makeCurrent();
            GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT);
            GLES20.glUseProgram(imageProgram);
            bindQuad(imageProgram);
            GLES20.glActiveTexture(GLES20.GL_TEXTURE0);
            GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, showTex);
            GLES20.glUniform1i(GLES20.glGetUniformLocation(imageProgram, "uTex"), 0);
            GLES20.glUniform2f(GLES20.glGetUniformLocation(imageProgram, "uScale"), curScale[0], curScale[1]);
            GLES20.glDrawArrays(GLES20.GL_TRIANGLE_STRIP, 0, 4);
            egl.swap();
        }

        private void drawTransition(float t) {
            if (egl == null || !egl.valid()) return;
            int prog = transitionProgram(transitionType);
            if (prog == 0) { animating = false; drawStatic(); return; }
            egl.makeCurrent();
            GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT);
            GLES20.glUseProgram(prog);
            bindQuad(prog);
            GLES20.glActiveTexture(GLES20.GL_TEXTURE0);
            GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, fromTex);
            GLES20.glUniform1i(GLES20.glGetUniformLocation(prog, "uFrom"), 0);
            GLES20.glActiveTexture(GLES20.GL_TEXTURE1);
            GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, toTex);
            GLES20.glUniform1i(GLES20.glGetUniformLocation(prog, "uTo"), 1);
            GLES20.glUniform1f(GLES20.glGetUniformLocation(prog, "progress"), t);
            GLES20.glUniform1f(GLES20.glGetUniformLocation(prog, "ratio"),
                surfaceH > 0 ? (float) surfaceW / surfaceH : 1f);
            GLES20.glUniform2f(GLES20.glGetUniformLocation(prog, "uFromScale"), fromScale[0], fromScale[1]);
            GLES20.glUniform2f(GLES20.glGetUniformLocation(prog, "uToScale"), toScale[0], toScale[1]);
            GLES20.glDrawArrays(GLES20.GL_TRIANGLE_STRIP, 0, 4);
            egl.swap();
        }

        // ---- Video (external OES texture) ----
        private void startVideo(String path) {
            releaseVideo();
            try {
                if (oesProgram == 0) oesProgram = buildProgram(GlShaders.VERT, GlShaders.FRAG_OES);
                int[] t = new int[1];
                GLES20.glGenTextures(1, t, 0);
                videoTex = t[0];
                GLES20.glBindTexture(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, videoTex);
                GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_MIN_FILTER, GLES20.GL_LINEAR);
                GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_MAG_FILTER, GLES20.GL_LINEAR);
                GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_WRAP_S, GLES20.GL_CLAMP_TO_EDGE);
                GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_WRAP_T, GLES20.GL_CLAMP_TO_EDGE);
                videoSurfaceTexture = new SurfaceTexture(videoTex);
                videoSurfaceTexture.setOnFrameAvailableListener(st -> post(this::drawVideoFrame));
                Surface vs = new Surface(videoSurfaceTexture);
                player = new MediaPlayer();
                player.setSurface(vs);
                player.setDataSource(path);
                player.setLooping(true);
                player.setVolume(0f, 0f);
                player.setOnPreparedListener(mp -> { isVideo = true; if (visible) mp.start(); });
                player.prepareAsync();
            } catch (Exception e) {
                releaseVideo();
            }
        }

        private void drawVideoFrame() {
            if (egl == null || !egl.valid() || videoSurfaceTexture == null || oesProgram == 0) return;
            egl.makeCurrent();
            try {
                videoSurfaceTexture.updateTexImage();
                videoSurfaceTexture.getTransformMatrix(stMatrix);
            } catch (Exception e) { return; }
            int vw = player != null ? player.getVideoWidth() : surfaceW;
            int vh = player != null ? player.getVideoHeight() : surfaceH;
            float[] sc = coverScale(vw, vh, surfaceW, surfaceH);
            GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT);
            GLES20.glUseProgram(oesProgram);
            bindQuad(oesProgram);
            GLES20.glActiveTexture(GLES20.GL_TEXTURE0);
            GLES20.glBindTexture(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, videoTex);
            GLES20.glUniform1i(GLES20.glGetUniformLocation(oesProgram, "uTex"), 0);
            GLES20.glUniform2f(GLES20.glGetUniformLocation(oesProgram, "uScale"), sc[0], sc[1]);
            GLES20.glUniformMatrix4fv(GLES20.glGetUniformLocation(oesProgram, "uSTMatrix"), 1, false, stMatrix, 0);
            GLES20.glDrawArrays(GLES20.GL_TRIANGLE_STRIP, 0, 4);
            egl.swap();
        }

        private void releaseVideo() {
            if (player != null) {
                try { player.stop(); } catch (Exception ignored) {}
                player.release();
                player = null;
            }
            if (videoSurfaceTexture != null) {
                videoSurfaceTexture.release();
                videoSurfaceTexture = null;
            }
            isVideo = false;
        }

        private void releaseGL() {
            if (gl != null) {
                gl.removeCallbacks(rotateTick);
                gl.removeCallbacks(drawTick);
            }
            releaseVideo();
            if (egl != null) {
                egl.release();
                egl = null;
            }
            haveImage = false;
            animating = false;
            transPrograms.clear();
        }
    }
}
