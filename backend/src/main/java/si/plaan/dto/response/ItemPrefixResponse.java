package si.plaan.dto.response;

public record ItemPrefixResponse(
    Long id,
    String prefix,
    String description,
    long lastNumber,
    int paddingDigits,
    String nextCode
) {}
