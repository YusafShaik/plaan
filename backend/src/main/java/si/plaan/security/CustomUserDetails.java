package si.plaan.security;

import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import si.plaan.entity.Role;
import si.plaan.entity.User;

import java.util.Collection;
import java.util.List;

@Getter
public class CustomUserDetails implements UserDetails {

    private final Long id;
    private final String email;
    private final String password;
    private final Long organizationId;
    private final Role role;
    private final boolean active;
    private final Collection<? extends GrantedAuthority> authorities;

    public CustomUserDetails(User user) {
        this.id = user.getId();
        this.email = user.getEmail();
        this.password = user.getPasswordHash();
        this.organizationId = user.getOrganization().getId();
        this.role = user.getRole();
        // User must be active AND their parent organization must be active
        this.active = user.isActive() && (user.getOrganization() == null || user.getOrganization().isActive());
        this.authorities = List.of(new SimpleGrantedAuthority(user.getRole().name()));
    }

    public CustomUserDetails(Long id, String email, Long organizationId, Role role) {
        this.id = id;
        this.email = email;
        this.password = "";
        this.organizationId = organizationId;
        this.role = role;
        this.active = true;
        this.authorities = List.of(new SimpleGrantedAuthority(role.name()));
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return active;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return active;
    }
}
