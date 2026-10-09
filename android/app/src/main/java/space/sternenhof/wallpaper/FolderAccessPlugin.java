package space.sternenhof.wallpaper;

import android.content.ContentResolver;
import android.content.Intent;
import android.content.UriPermission;
import android.net.Uri;
import android.util.Base64;

import androidx.activity.result.ActivityResult;
import androidx.documentfile.provider.DocumentFile;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;

/**
 * Storage Access Framework bridge: let the user pick a real folder, keep
 * persistable read permission, list its media and read single files on demand.
 * The web layer (folders.ts) resolves each file to a Blob URL lazily, so only
 * the images actually on screen are read — a huge folder won't blow up memory.
 */
@CapacitorPlugin(name = "FolderAccess")
public class FolderAccessPlugin extends Plugin {

    @PluginMethod
    public void pickFolder(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(
            Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
        );
        startActivityForResult(call, intent, "folderPicked");
    }

    @ActivityCallback
    private void folderPicked(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != android.app.Activity.RESULT_OK || result.getData() == null) {
            call.resolve(new JSObject().put("cancelled", true));
            return;
        }
        Uri uri = result.getData().getData();
        try {
            getContext()
                .getContentResolver()
                .takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
        } catch (Exception ignored) {}
        DocumentFile dir = DocumentFile.fromTreeUri(getContext(), uri);
        String name = (dir != null && dir.getName() != null) ? dir.getName() : uri.getLastPathSegment();
        JSObject ret = new JSObject();
        ret.put("uri", uri.toString());
        ret.put("name", name);
        call.resolve(ret);
    }

    @PluginMethod
    public void listFolder(PluginCall call) {
        String uriStr = call.getString("uri");
        String kind = call.getString("kind", "image");
        if (uriStr == null) {
            call.reject("missing uri");
            return;
        }
        try {
            DocumentFile dir = DocumentFile.fromTreeUri(getContext(), Uri.parse(uriStr));
            JSArray files = new JSArray();
            if (dir != null && dir.isDirectory()) {
                for (DocumentFile f : dir.listFiles()) {
                    if (!f.isFile()) continue;
                    String mime = f.getType();
                    boolean match = mime != null
                        && ("video".equals(kind) ? mime.startsWith("video/") : mime.startsWith("image/"));
                    if (!match) continue;
                    JSObject o = new JSObject();
                    o.put("name", f.getName());
                    o.put("uri", f.getUri().toString());
                    files.put(o);
                }
            }
            call.resolve(new JSObject().put("files", files));
        } catch (Exception e) {
            call.reject("listFolder failed: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void readFile(PluginCall call) {
        String uriStr = call.getString("uri");
        if (uriStr == null) {
            call.reject("missing uri");
            return;
        }
        try {
            ContentResolver cr = getContext().getContentResolver();
            Uri uri = Uri.parse(uriStr);
            InputStream in = cr.openInputStream(uri);
            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            byte[] buf = new byte[65536];
            int n;
            while ((n = in.read(buf)) > 0) bos.write(buf, 0, n);
            in.close();
            String b64 = Base64.encodeToString(bos.toByteArray(), Base64.NO_WRAP);
            String mime = cr.getType(uri);
            JSObject ret = new JSObject();
            ret.put("data", b64);
            ret.put("mime", mime != null ? mime : "application/octet-stream");
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("readFile failed: " + e.getMessage(), e);
        }
    }

    /** Is the persisted read permission for this tree URI still held? */
    @PluginMethod
    public void hasAccess(PluginCall call) {
        String uriStr = call.getString("uri");
        boolean ok = false;
        if (uriStr != null) {
            try {
                Uri uri = Uri.parse(uriStr);
                for (UriPermission p : getContext().getContentResolver().getPersistedUriPermissions()) {
                    if (p.getUri().equals(uri) && p.isReadPermission()) {
                        ok = true;
                        break;
                    }
                }
            } catch (Exception ignored) {}
        }
        call.resolve(new JSObject().put("granted", ok));
    }
}
