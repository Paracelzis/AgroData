package com.example.demo.controller;

import com.example.demo.model.Sensor;
import com.example.demo.service.SensorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/sensors")
public class SensorController {
    @Autowired
    private SensorService sensorService;

    @GetMapping("/all")  // Изменим на это
    public List<Sensor> getAllSensors() {
        return sensorService.findAll();
    }

    @GetMapping("/field/{fieldId}")
    public List<Sensor> getSensorsByFieldId(@PathVariable String fieldId) {
        return sensorService.findByFieldId(fieldId);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Sensor> getSensorById(@PathVariable String id) {
        return sensorService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Sensor> createSensor(@RequestBody Sensor sensor) {
        return ResponseEntity.ok(sensorService.save(sensor));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Sensor> updateSensor(@PathVariable String id, @RequestBody Sensor sensor) {
        return sensorService.findById(id)
                .map(existingSensor -> {
                    sensor.setId(id);
                    return ResponseEntity.ok(sensorService.save(sensor));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSensor(@PathVariable String id) {
        return sensorService.findById(id)
                .map(sensor -> {
                    sensorService.deleteById(id);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}