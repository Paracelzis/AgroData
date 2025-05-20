package com.example.demo.service;

import com.example.demo.model.User;
import com.example.demo.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Optional;

@Service
public class UserService implements UserDetailsService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("Пользователь с именем " + username + " не найден"));
    }

    public User createUser(User user) {
        user.setPassword(passwordEncoder.encode(user.getPassword()));

        // Если это первый пользователь, даем ему роль ADMIN
        if (userRepository.count() == 0) {
            user.addRole("ADMIN");
        } else {
            // По умолчанию даем роль READ_ONLY вместо USER
            user.addRole("READ_ONLY");
        }

        return userRepository.save(user);
    }

    public boolean userExists(String username) {
        return userRepository.existsByUsername(username);
    }

    public boolean emailExists(String email) {
        return userRepository.existsByEmail(email);
    }

    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    // Дополнительные методы для административных функций

    public Page<User> findAllPaged(Pageable pageable) {
        return userRepository.findAll(pageable);
    }

    public Optional<User> findById(String id) {
        return userRepository.findById(id);
    }

    public void toggleUserStatus(String id) {
        userRepository.findById(id).ifPresent(user -> {
            user.setEnabled(!user.isEnabled());
            userRepository.save(user);
        });
    }

    public void updateUserRole(String id, String role) {
        userRepository.findById(id).ifPresent(user -> {
            if (user.getRoles().contains(role)) {
                user.getRoles().remove(role);
            } else {
                user.addRole(role);
            }
            userRepository.save(user);
        });
    }
}