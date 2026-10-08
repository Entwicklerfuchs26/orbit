package space.sternenhof.wallpaper;

import android.app.WallpaperManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;

/**
 * Native wallpaper bridge.
 *  - setWallpaper: static OS wallpaper via WallpaperManager.setBitmap.
 *  - setLiveMedia / openLiveWallpaperPicker / isLiveWallpaperActive: SKWD live
 *    wallpaper (animated crossfade for images, looping video) via
 *    SkwdWallpaperService.
 */
@CapacitorPlugin(name = "Wallpaper")
public class WallpaperPlugin extends Plugin {

    @PluginMethod
    public void setWallpaper(PluginCall call) {
        String data = call.getString("data");
        if (data == null || data.isEmpty()) {
            call.reject("Missing 'data' (base64 image)");
            return;
        }
        String target = call.getString("target", "both");
        try {
            byte[] bytes = Base64.decode(data, Base64.DEFAULT);
            Bitmap bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
            if (bitmap == null) {
                call.reject("Could not decode image");
                return;
            }
            WallpaperManager wm = WallpaperManager.getInstance(getContext());
            int flags;
            if ("home".equals(target)) {
                flags = WallpaperManager.FLAG_SYSTEM;
            } else if ("lock".equals(target)) {
                flags = WallpaperManager.FLAG_LOCK;
            } else {
                flags = WallpaperManager.FLAG_SYSTEM | WallpaperManager.FLAG_LOCK;
            }
            wm.setBitmap(bitmap, null, true, flags);
            call.resolve();
        } catch (Exception e) {
            call.reject("setWallpaper failed: " + e.getMessage(), e);
        }
    }

    /** Write the current media to a file and tell the live service to reload. */
    @PluginMethod
    public void setLiveMedia(PluginCall call) {
        String data = call.getString("data");
        String kind = call.getString("kind", "image");
        if (data == null || data.isEmpty()) {
            call.reject("Missing 'data' (base64 media)");
            return;
        }
        try {
            byte[] bytes = Base64.decode(data, Base64.DEFAULT);
            String name = "video".equals(kind) ? "live_media.mp4" : "live_media.img";
            File out = new File(getContext().getFilesDir(), name);
            try (FileOutputStream fos = new FileOutputStream(out)) {
                fos.write(bytes);
            }
            SharedPreferences prefs = getContext()
                .getSharedPreferences(SkwdWallpaperService.PREFS, Context.MODE_PRIVATE);
            prefs.edit()
                .putString(SkwdWallpaperService.KEY_MODE, "single")
                .putString(SkwdWallpaperService.KEY_PATH, out.getAbsolutePath())
                .putString(SkwdWallpaperService.KEY_KIND, kind)
                .apply();
            broadcastUpdate();
            call.resolve();
        } catch (Exception e) {
            call.reject("setLiveMedia failed: " + e.getMessage(), e);
        }
    }

    private void broadcastUpdate() {
        // Explicit to our package so it reaches the NOT_EXPORTED receiver on Android 14+.
        Intent update = new Intent(SkwdWallpaperService.ACTION_UPDATE);
        update.setPackage(getContext().getPackageName());
        getContext().sendBroadcast(update);
    }

    private File poolDir() {
        File dir = new File(getContext().getFilesDir(), "live_pool");
        if (!dir.exists()) dir.mkdirs();
        return dir;
    }

    /** Empty the rotation pool folder before (re)filling it. */
    @PluginMethod
    public void clearLivePool(PluginCall call) {
        try {
            File dir = poolDir();
            File[] files = dir.listFiles();
            if (files != null) for (File f : files) f.delete();
            call.resolve();
        } catch (Exception e) {
            call.reject("clearLivePool failed: " + e.getMessage(), e);
        }
    }

    /** Write one downscaled pool image as <index>.jpg. */
    @PluginMethod
    public void addLivePoolImage(PluginCall call) {
        String data = call.getString("data");
        Integer index = call.getInt("index");
        if (data == null || index == null) {
            call.reject("Missing 'data'/'index'");
            return;
        }
        try {
            byte[] bytes = Base64.decode(data, Base64.DEFAULT);
            File f = new File(poolDir(), index + ".jpg");
            try (FileOutputStream fos = new FileOutputStream(f)) {
                fos.write(bytes);
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("addLivePoolImage failed: " + e.getMessage(), e);
        }
    }

    /** Switch the live service to rotate mode over the written pool. */
    @PluginMethod
    public void startLivePool(PluginCall call) {
        int count = call.getInt("count", 0);
        int intervalMs = call.getInt("interval", 300000);
        boolean rnd = Boolean.TRUE.equals(call.getBoolean("random", false));
        try {
            SharedPreferences prefs = getContext()
                .getSharedPreferences(SkwdWallpaperService.PREFS, Context.MODE_PRIVATE);
            prefs.edit()
                .putString(SkwdWallpaperService.KEY_MODE, "rotate")
                .putInt(SkwdWallpaperService.KEY_POOL_COUNT, count)
                .putLong(SkwdWallpaperService.KEY_INTERVAL, intervalMs)
                .putBoolean(SkwdWallpaperService.KEY_RANDOM, rnd)
                .apply();
            broadcastUpdate();
            call.resolve();
        } catch (Exception e) {
            call.reject("startLivePool failed: " + e.getMessage(), e);
        }
    }

    /**
     * Append one base64 chunk to the live video file (reset=true truncates first).
     * Videos are streamed in small chunks so no single huge base64 payload ever
     * crosses the bridge (that froze the main thread → ANR).
     */
    @PluginMethod
    public void writeLiveVideoChunk(PluginCall call) {
        String data = call.getString("data");
        boolean reset = Boolean.TRUE.equals(call.getBoolean("reset", false));
        if (data == null) {
            call.reject("Missing 'data' (base64 chunk)");
            return;
        }
        try {
            File f = new File(getContext().getFilesDir(), "live_media.mp4");
            if (reset && f.exists()) f.delete();
            byte[] bytes = Base64.decode(data, Base64.DEFAULT);
            try (FileOutputStream fos = new FileOutputStream(f, true)) {
                fos.write(bytes);
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("writeLiveVideoChunk failed: " + e.getMessage(), e);
        }
    }

    /** Finalize the streamed video: point the live service at it and reload. */
    @PluginMethod
    public void finishLiveVideo(PluginCall call) {
        try {
            File f = new File(getContext().getFilesDir(), "live_media.mp4");
            SharedPreferences prefs = getContext()
                .getSharedPreferences(SkwdWallpaperService.PREFS, Context.MODE_PRIVATE);
            prefs.edit()
                .putString(SkwdWallpaperService.KEY_MODE, "single")
                .putString(SkwdWallpaperService.KEY_PATH, f.getAbsolutePath())
                .putString(SkwdWallpaperService.KEY_KIND, "video")
                .apply();
            broadcastUpdate();
            call.resolve();
        } catch (Exception e) {
            call.reject("finishLiveVideo failed: " + e.getMessage(), e);
        }
    }

    /** Store the transition type + duration the live service should use on change. */
    @PluginMethod
    public void setLiveTransition(PluginCall call) {
        String type = call.getString("type", "fade");
        int ms = call.getInt("ms", 600);
        try {
            SharedPreferences prefs = getContext()
                .getSharedPreferences(SkwdWallpaperService.PREFS, Context.MODE_PRIVATE);
            prefs.edit()
                .putString(SkwdWallpaperService.KEY_TRANSITION, type)
                .putLong(SkwdWallpaperService.KEY_TRANSITION_MS, ms)
                .apply();
            call.resolve();
        } catch (Exception e) {
            call.reject("setLiveTransition failed: " + e.getMessage(), e);
        }
    }

    /** Open Android's live-wallpaper picker preset to our service. */
    @PluginMethod
    public void openLiveWallpaperPicker(PluginCall call) {
        try {
            Intent intent = new Intent(WallpaperManager.ACTION_CHANGE_LIVE_WALLPAPER);
            intent.putExtra(
                WallpaperManager.EXTRA_LIVE_WALLPAPER_COMPONENT,
                new ComponentName(getContext(), SkwdWallpaperService.class)
            );
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("openLiveWallpaperPicker failed: " + e.getMessage(), e);
        }
    }

    /** Whether our live wallpaper is the currently active one. */
    @PluginMethod
    public void isLiveWallpaperActive(PluginCall call) {
        boolean active = false;
        try {
            WallpaperManager wm = WallpaperManager.getInstance(getContext());
            android.app.WallpaperInfo info = wm.getWallpaperInfo();
            active = info != null
                && SkwdWallpaperService.class.getName().equals(info.getServiceName());
        } catch (Exception ignored) {}
        JSObject ret = new JSObject();
        ret.put("active", active);
        call.resolve(ret);
    }
}
