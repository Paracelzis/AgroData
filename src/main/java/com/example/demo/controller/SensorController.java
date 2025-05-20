package com.example.demo.controller;

import com.example.demo.model.Sensor;
import com.example.demo.service.SensorDataService;
import com.example.demo.service.SensorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/sensors")
public class SensorController {
    @Autowired
    private SensorService sensorService;

    @Autowired
    private SensorDataService sensorDataService;

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
    public ResponseEntity<?> deleteSensor(@PathVariable String id) {
        try {
            return sensorService.findById(id)
                    .map(sensor -> {
                        try {
                            // Получаем количество записей датчика
                            long sensorDataCount = sensorDataService.countBySensorId(sensor.getId());

                            // Удаляем все данные датчика
                            sensorDataService.deleteBySensorId(sensor.getId());

                            // Удаляем сам датчик
                            sensorService.deleteById(id);

                            // Возвращаем информацию об удалении
                            Map<String, Object> response = new HashMap<>();
                            response.put("success", true);
                            response.put("message", "Датчик успешно удален");
                            response.put("deletedDataCount", sensorDataCount);

                            return ResponseEntity.ok(response);
                        } catch (Exception e) {
                            e.printStackTrace();
                            // В случае ошибки при удалении данных датчика, возвращаем ошибку
                            Map<String, Object> errorResponse = new HashMap<>();
                            errorResponse.put("error", "Ошибка при удалении данных датчика: " + e.getMessage());
                            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
                        }
                    })
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception ex) {
            ex.printStackTrace();
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Ошибка при удалении датчика: " + ex.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
}