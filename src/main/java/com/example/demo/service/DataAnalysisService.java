package com.example.demo.service;

import com.example.demo.model.SensorData;
import com.example.demo.repository.SensorDataRepository;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.io.FileOutputStream;
import java.io.IOException;
import java.util.List;

@Service
public class DataAnalysisService {
    @Autowired
    private SensorDataRepository sensorDataRepository;

    public void exportDataAnalysisToWord(String fieldId, String filePath) throws IOException {



    }
}