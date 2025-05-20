package com.example.demo.config;

import com.example.demo.model.User;
import com.example.demo.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.ArrayList;
import java.util.Collections;

@Configuration
public class DataInitializer {

    @Bean
    public CommandLineRunner initializeUsers(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            // Проверяем, есть ли пользователи в базе
            if (userRepository.count() == 0) {
                // Создаем администратора по умолчанию
                User admin = new User();
                admin.setUsername("admin");
                admin.setPassword(passwordEncoder.encode("admin"));
                admin.setEmail("admin@example.com");
                admin.setFullName("Системный администратор");
                admin.setRoles(new ArrayList<>(Collections.singletonList("ADMIN")));
                admin.setEnabled(true);

                userRepository.save(admin);

                System.out.println("Создан пользователь-администратор по умолчанию:");
                System.out.println("Логин: admin");
                System.out.println("Пароль: admin");
                System.out.println("Рекомендуется сменить этот пароль в производственной среде!");
            }
        };
    }
}