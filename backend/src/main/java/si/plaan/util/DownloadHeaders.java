package si.plaan.util;

public final class DownloadHeaders {

    private DownloadHeaders() {}

    /** Safe Content-Disposition filename (no quotes/path/CRLF). */
    public static String contentDisposition(String fileName) {
        String safe = fileName == null || fileName.isBlank() ? "download" : fileName;
        // keep only basename-safe chars
        safe = safe.replaceAll("[^A-Za-z0-9._-]", "_");
        if (safe.isBlank() || safe.chars().allMatch(c -> c == '_')) {
            safe = "download";
        }
        return "attachment; filename=\"" + safe + "\"";
    }
}
