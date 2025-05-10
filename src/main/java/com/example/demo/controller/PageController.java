package com.example.demo.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class PageController {
    // Страница для просмотра полей
    @GetMapping("/fields-page")
    public String getFieldsPage() {
        return "fields"; // Имя HTML файла без расширения
    }

    // Страница для просмотра данных с датчиков
    @GetMapping("/field-data")
    public String getFieldDataPage() {
        return "field-data"; // Имя HTML файла без расширения
    }

    // Страница для добавления датчиков
    @GetMapping("/add-sensor")
    public String getAddSensorPage() {
        return "add-sensor"; // Имя HTML файла без расширения
    }

    // Страница для просмотра датчиков
    @GetMapping("/sensors")
    public String getSensorsPage() {
        return "sensors"; // Имя HTML файла без расширения
    }
}