package si.plaan.util;

import java.util.Base64;
import java.util.Set;

public final class AttachmentLimits {

    public static final int MAX_BYTES = 5 * 1024 * 1024; // 5 MB decoded
    private static final Set<String> ALLOWED_TYPES = Set.of(
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp"
    );

    private AttachmentLimits() {}

    public static void validate(String fileName, String contentType, String dataUrlOrBase64) {
        if (dataUrlOrBase64 == null || dataUrlOrBase64.isBlank()) {
            return;
        }
        if (contentType != null && !contentType.isBlank() && !ALLOWED_TYPES.contains(contentType.toLowerCase())) {
            throw new IllegalArgumentException("Attachment type not allowed. Use PDF or image.");
        }
        String data = dataUrlOrBase64;
        if (data.contains(",")) {
            data = data.substring(data.indexOf(',') + 1);
        }
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(data);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Attachment data is not valid base64");
        }
        if (bytes.length > MAX_BYTES) {
            throw new IllegalArgumentException("Attachment exceeds maximum size of 5 MB");
        }
        if (fileName != null && (fileName.contains("\"") || fileName.contains("\r") || fileName.contains("\n")
                || fileName.contains("/") || fileName.contains("\\"))) {
            throw new IllegalArgumentException("Attachment file name contains invalid characters");
        }
    }
}
