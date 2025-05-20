package com.example.demo.controller;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class PageController {
    // Страница для просмотра полей
    @GetMapping("/fields-page")
    public String getFieldsPage(Model model) {
        addUserToModel(model);
        return "fields"; // Имя HTML файла без расширения
    }

    // Страница для просмотра данных с датчиков
    @GetMapping("/field-data")
    public String getFieldDataPage(Model model) {
        addUserToModel(model);
        return "field-data"; // Имя HTML файла без расширения
    }

    // Страница для добавления датчиков
    @GetMapping("/add-sensor")
    public String getAddSensorPage(Model model) {
        addUserToModel(model);
        return "add-sensor"; // Имя HTML файла без расширения
    }

    // Страница для просмотра датчиков
    @GetMapping("/sensors")
    public String getSensorsPage(Model model) {
        addUserToModel(model);
        return "sensors"; // Имя HTML файла без расширения
    }

    // Главная страница (перенаправление на страницу полей)
    @GetMapping("/")
    public String home() {
        return "redirect:/fields-page";
    }

    // Вспомогательный метод для добавления данных пользователя в модель
    private void addUserToModel(Model model) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !auth.getName().equals("anonymousUser")) {
            model.addAttribute("username", auth.getName());
            model.addAttribute("isAdmin", auth.getAuthorities().stream()
                    .anyMatch(r -> r.getAuthority().equals("ROLE_ADMIN")));
            model.addAttribute("isUser", auth.getAuthorities().stream()
                    .anyMatch(r -> r.getAuthority().equals("ROLE_USER")));
            model.addAttribute("isReadOnly", auth.getAuthorities().stream()
                    .anyMatch(r -> r.getAuthority().equals("ROLE_READ_ONLY")));
            model.addAttribute("canEdit", auth.getAuthorities().stream()
                    .anyMatch(r -> r.getAuthority().equals("ROLE_ADMIN") ||
                            r.getAuthority().equals("ROLE_USER")));
        }
    }
}