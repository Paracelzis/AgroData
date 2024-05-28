package com.example.demo.controller;

import com.example.demo.model.SensorData;
import com.example.demo.service.SensorDataService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.text.ParseException;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/sensorData")
public class SensorDataController {
    @Autowired
    private SensorDataService sensorDataService;

    @PostMapping
    public List<SensorData> addSensorData(@RequestBody List<SensorData> sensorData) {
        return sensorDataService.saveAll(sensorData);
    }

    @GetMapping("/field/{fieldId}")
    public List<SensorData> getFieldSensorData(@PathVariable String fieldId,
                                               @RequestParam int page,
                                               @RequestParam int size) {
        Pageable pageable = PageRequest.of(page, size);
        return sensorDataService.findByFieldIdOrderByTimestampDesc(fieldId, pageable).getContent();
    }

    @GetMapping("/{id}")
    public ResponseEntity<SensorData> getSensorDataById(@PathVariable String id) {
        Optional<SensorData> sensorData = sensorDataService.findById(id);
        return sensorData.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<SensorData> updateSensorData(@PathVariable String id, @RequestBody SensorData sensorData) {
        if (!sensorDataService.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        sensorData.setId(id);
        SensorData updatedSensorData = sensorDataService.save(sensorData);
        return ResponseEntity.ok(updatedSensorData);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSensorData(@PathVariable String id) {
        try {
            sensorDataService.deleteById(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{fieldId}/{sensorName}")
    public List<SensorData> getSensorData(
            @PathVariable String fieldId,
            @PathVariable String sensorName,
            @RequestParam String start,
            @RequestParam String end) throws ParseException {
        return sensorDataService.getSensorData(fieldId, sensorName, start, end);
    }

    @GetMapping("/{fieldId}/{sensorName}/all")
    public List<SensorData> getAllTimeSensorData(
            @PathVariable String fieldId,
            @PathVariable String sensorName) {
        return sensorDataService.getAllTimeSensorData(fieldId, sensorName);
    }

}
