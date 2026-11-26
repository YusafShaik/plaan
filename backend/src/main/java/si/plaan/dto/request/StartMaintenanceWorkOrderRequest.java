package si.plaan.dto.request;

import java.time.LocalDate;
import java.time.LocalTime;

/** Optional override for start timestamp; defaults to now when omitted. */
public record StartMaintenanceWorkOrderRequest(
    LocalDate startDate,
    LocalTime startTime
) {}
