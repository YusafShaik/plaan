package si.plaan.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.entity.Organization;
import si.plaan.entity.Role;
import si.plaan.entity.User;
import si.plaan.repository.OrganizationRepository;
import si.plaan.repository.UserRepository;

@Slf4j
@Component
@Profile({"dev", "local", "test"})
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final si.plaan.repository.ItemPrefixRepository itemPrefixRepository;
    private final si.plaan.repository.SupplierRepository supplierRepository;

    @Override
    @Transactional
    public void run(String... args) {
        // 1. Seed Platform System Tenant & Platform Admin
        if (!userRepository.existsByEmail("platform@plaan.io")) {
            Organization platformOrg = organizationRepository.findBySlug("plaan-platform")
                    .orElseGet(() -> organizationRepository.save(
                            Organization.builder()
                                    .name("Plaan Platform Administration")
                                    .slug("plaan-platform")
                                    .country("Global")
                                    .baseCurrency("USD")
                                    .timeZone("UTC")
                                    .active(true)
                                    .build()
                    ));

            User platformAdmin = User.builder()
                    .organization(platformOrg)
                    .email("platform@plaan.io")
                    .passwordHash(passwordEncoder.encode("admin123"))
                    .fullName("Platform Administrator")
                    .role(Role.ROLE_PLATFORM_ADMIN)
                    .active(true)
                    .build();
            userRepository.save(platformAdmin);

            log.info("Platform Admin created: platform@plaan.io (dev seed — change password before any shared use)");
        }

        // 2. Seed Default Customer Organization & Org Admin
        if (!organizationRepository.existsBySlug("acme-mfg")) {
            Organization acmeOrg = Organization.builder()
                    .name("Acme Manufacturing Corp")
                    .slug("acme-mfg")
                    .country("India")
                    .baseCurrency("INR")
                    .timeZone("Asia/Kolkata")
                    .active(true)
                    .build();
            organizationRepository.save(acmeOrg);

            User defaultOrgAdmin = User.builder()
                    .organization(acmeOrg)
                    .email("admin@plaan.io")
                    .passwordHash(passwordEncoder.encode("admin123"))
                    .fullName("Ravi Kumar")
                    .role(Role.ROLE_ORG_ADMIN)
                    .active(true)
                    .build();
            userRepository.save(defaultOrgAdmin);

            log.info("Customer Org Admin created: admin@plaan.io (Acme Manufacturing Corp, dev seed)");
        }

        // 3. Seed Default Item Prefix for Acme if missing
        organizationRepository.findBySlug("acme-mfg").ifPresent(acmeOrg -> {
            if (!itemPrefixRepository.existsByOrganizationIdAndPrefixIgnoreCase(acmeOrg.getId(), "ITM-")) {
                itemPrefixRepository.save(
                        si.plaan.entity.ItemPrefix.builder()
                                .organization(acmeOrg)
                                .prefix("ITM-")
                                .description("Standard Item")
                                .lastNumber(4L)
                                .paddingDigits(3)
                                .build()
                );
                log.info("Seeded default ITM- prefix for Acme");
            }

            // 4. Seed Initial Suppliers for Acme if none exist
            if (supplierRepository.countByOrganizationId(acmeOrg.getId()) == 0) {
                supplierRepository.save(si.plaan.entity.Supplier.builder()
                        .organization(acmeOrg)
                        .supplierCode("SUP-001")
                        .name("Sri Timber Traders")
                        .contactPerson("Ramesh")
                        .phone("+91 98765 43210")
                        .email("sales@sritimber.com")
                        .address("Plot 12, Peenya Industrial Area, Bengaluru")
                        .taxId("29ABCDE1234F1Z5")
                        .active(true)
                        .build());

                supplierRepository.save(si.plaan.entity.Supplier.builder()
                        .organization(acmeOrg)
                        .supplierCode("SUP-002")
                        .name("Apex Hardware & Fasteners")
                        .contactPerson("Priya Sharma")
                        .phone("+91 98450 11223")
                        .email("info@apexhardware.in")
                        .address("45 GST Road, Guindy, Chennai")
                        .taxId("33AABCA5678G1Z2")
                        .active(true)
                        .build());

                supplierRepository.save(si.plaan.entity.Supplier.builder()
                        .organization(acmeOrg)
                        .supplierCode("SUP-003")
                        .name("National Polymers Ltd")
                        .contactPerson("Anil Verma")
                        .phone("+91 99001 22334")
                        .email("orders@nationalpolymers.com")
                        .address("Sector 58, Phase 2, Noida")
                        .taxId("09AAACN9012H1Z8")
                        .active(true)
                        .build());

                log.info("Seeded default suppliers SUP-001, SUP-002, SUP-003 for Acme");
            }
        });
    }
}
