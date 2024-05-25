package com.example.demo.service;

import com.example.demo.model.SensorData;
import com.example.demo.repository.SensorDataRepository;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.FileOutputStream;
import java.io.IOException;
import java.util.List;

@Service
public class DataAnalysisService {
    @Autowired
    private SensorDataRepository sensorDataRepository;

    public void exportDataAnalysisToWord(String fieldId, String filePath) throws IOException {
        List<SensorData> sensorData = sensorDataRepository.findByFieldIdOrderByTimestampDesc(fieldId);

        XWPFDocument document = new XWPFDocument();

        // Создание заголовка документа
        XWPFParagraph title = document.createParagraph();
        XWPFRun titleRun = title.createRun();
        titleRun.setText("Data Analysis for Field: " + fieldId);
        titleRun.setBold(true);
        titleRun.setFontSize(20);

        // Анализ данных и создание параграфов для каждого сенсора
        for (SensorData data : sensorData) {
            XWPFParagraph paragraph = document.createParagraph();
            XWPFRun run = paragraph.createRun();
            run.setText("Sensor: " + data.getSensorName() + ", Value: " + data.getValue() + ", Timestamp: " + data.getTimestamp());
            run.setFontSize(12);
        }

        // Запись в документ
        try (FileOutputStream out = new FileOutputStream(filePath)) {
            document.write(out);
        }
        document.close();
    }
}