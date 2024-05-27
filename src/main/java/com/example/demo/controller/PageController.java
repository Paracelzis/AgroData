package com.example.demo.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class PageController {

    @GetMapping("/fields-page")
    public String getFieldsPage() {
        return "fields"; // Это имя HTML файла без расширения
    }

    @GetMapping("/field-data")
    public String getFieldDataPage() {
        return "field-data"; // Это имя HTML файла без расширения
    }

    @GetMapping("/add-sensor-data")
    public String getAddSensorDataPage() {
        return "add-sensor-data"; // Это имя HTML файла без расширения
    }

    @GetMapping("/data-analysis")
    public String getAnalysisPage() {
        return "data-analysis"; // Это имя HTML файла без расширения
    }
}
