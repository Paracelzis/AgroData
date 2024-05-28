package com.example.demo.service;

import com.example.demo.model.SensorData;
import com.example.demo.repository.SensorDataRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Optional;

@Service
public class SensorDataService {
    @Autowired
    private SensorDataRepository sensorDataRepository;

    private SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");

    public List<SensorData> getSensorData(String fieldId, String sensorName, String startDate, String endDate) throws ParseException {
        Date start = dateFormat.parse(startDate);
        Date end = dateFormat.parse(endDate);
        return sensorDataRepository.findByFieldIdAndSensorNameAndTimestampBetween(fieldId, sensorName, start, end);
    }

    public List<SensorData> getAllTimeSensorData(String fieldId, String sensorName) {
        return sensorDataRepository.findByFieldIdAndSensorName(fieldId, sensorName);
    }

    public List<SensorData> saveAll(List<SensorData> sensorData) {
        return sensorDataRepository.saveAll(sensorData);
    }

    public Optional<SensorData> findById(String id) {
        return sensorDataRepository.findById(id);
    }

    public boolean existsById(String id) {
        return sensorDataRepository.existsById(id);
    }

    public SensorData save(SensorData sensorData) {
        return sensorDataRepository.save(sensorData);
    }

    public void deleteById(String id) {
        sensorDataRepository.deleteById(id);
    }

    public Page<SensorData> findByFieldIdOrderByTimestampDesc(String fieldId, Pageable pageable) {
        return sensorDataRepository.findByFieldIdOrderByTimestampDesc(fieldId, pageable);
    }
}
