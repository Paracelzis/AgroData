package com.example.demo.controller;

import com.example.demo.model.User;
import com.example.demo.service.UserService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
public class AuthController {

    private final UserService userService;
    private final AuthenticationManager authenticationManager;

    public AuthController(UserService userService, AuthenticationManager authenticationManager) {
        this.userService = userService;
        this.authenticationManager = authenticationManager;
    }

    @GetMapping("/login")
    public String login(@RequestParam(required = false) String error,
                        @RequestParam(required = false) String registered,
                        Model model) {
        if (error != null) {
            model.addAttribute("error", "Неверные имя пользователя или пароль");
        }

        if (registered != null) {
            model.addAttribute("success", "Регистрация прошла успешно! Теперь вы можете войти.");
        }

        return "login";
    }

    @GetMapping("/register")
    public String showRegistrationForm(Model model) {
        model.addAttribute("user", new User());
        return "register";
    }

    @PostMapping("/register")
    public String registerUser(@ModelAttribute User user, Model model) {
        // Проверка существования пользователя
        if (userService.userExists(user.getUsername())) {
            model.addAttribute("error", "Пользователь с таким именем уже существует");
            return "register";
        }

        // Проверка существования email
        if (userService.emailExists(user.getEmail())) {
            model.addAttribute("error", "Пользователь с таким email уже существует");
            return "register";
        }

        // Сохраняем пароль до шифрования для дальнейшей аутентификации
        String rawPassword = user.getPassword();

        // Создание пользователя
        User savedUser = userService.createUser(user);

        // Автоматический вход после регистрации
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(savedUser.getUsername(), rawPassword)
            );
            SecurityContextHolder.getContext().setAuthentication(authentication);
            return "redirect:/fields-page";
        } catch (Exception e) {
            // Если автоматический вход не удался, перенаправляем на страницу входа
            return "redirect:/login?registered";
        }
    }
}