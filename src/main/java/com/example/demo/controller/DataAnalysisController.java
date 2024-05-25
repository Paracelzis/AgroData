package com.example.demo.controller;

import com.example.demo.service.DataAnalysisService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;

@RestController
@RequestMapping("/analysis")
public class DataAnalysisController {
    @Autowired
    private DataAnalysisService dataAnalysisService;

    @GetMapping("/export/{fieldId}")
    public void exportAnalysis(@PathVariable String fieldId, @RequestParam String filePath) throws IOException {
        dataAnalysisService.exportDataAnalysisToWord(fieldId, filePath);
    }
}