package com.example.demo.controller;

import com.example.demo.model.SensorData;
import com.example.demo.repository.SensorDataRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/sensorData")
public class SensorDataController {
    @Autowired
    private SensorDataRepository sensorDataRepository;

    @PostMapping
    public List<SensorData> addSensorData(@RequestBody List<SensorData> sensorData) {
        return sensorDataRepository.saveAll(sensorData);
    }

    @GetMapping("/field/{fieldId}")
    public List<SensorData> getFieldSensorData(@PathVariable String fieldId, @RequestParam int page, @RequestParam int size) {
        Pageable pageable = PageRequest.of(page, size);
        return sensorDataRepository.findByFieldIdOrderByTimestampDesc(fieldId, pageable).getContent();
    }

    @GetMapping("/{id}")
    public ResponseEntity<SensorData> getSensorDataById(@PathVariable String id) {
        Optional<SensorData> sensorData = sensorDataRepository.findById(id);
        return sensorData.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<SensorData> updateSensorData(@PathVariable String id, @RequestBody SensorData sensorData) {
        if (!sensorDataRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        sensorData.setId(id);
        SensorData updatedSensorData = sensorDataRepository.save(sensorData);
        return ResponseEntity.ok(updatedSensorData);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSensorData(@PathVariable String id) {
        try {
            sensorDataRepository.deleteById(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
