package com.example.demo.controller;

import com.example.demo.model.User;
import com.example.demo.service.UserService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

@Controller
@RequestMapping("/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final UserService userService;

    public AdminController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/users")
    public String listUsers(Model model,
                            @RequestParam(defaultValue = "0") int page,
                            @RequestParam(defaultValue = "10") int size) {
        Page<User> usersPage = userService.findAllPaged(PageRequest.of(page, size));

        model.addAttribute("users", usersPage.getContent());
        model.addAttribute("currentPage", page);
        model.addAttribute("totalPages", usersPage.getTotalPages());
        model.addAttribute("totalItems", usersPage.getTotalElements());
        model.addAttribute("size", size);
        model.addAttribute("canEdit", true); // Добавляем переменную canEdit со значением true

        return "admin/users";
    }

    @GetMapping("/users/{id}")
    public String viewUser(@PathVariable String id, Model model) {
        User user = userService.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Неверный ID пользователя: " + id));
        model.addAttribute("user", user);
        return "admin/user-details";
    }

    @PostMapping("/users/{id}/toggle-status")
    public String toggleUserStatus(@PathVariable String id) {
        userService.toggleUserStatus(id);
        return "redirect:/admin/users";
    }

    @PostMapping("/users/{id}/roles")
    public String updateUserRoles(@PathVariable String id, @RequestParam("role") String role) {
        userService.updateUserRole(id, role);
        return "redirect:/admin/users/" + id;
    }
}