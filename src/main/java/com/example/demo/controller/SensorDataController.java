package com.example.demo.controller;

import com.example.demo.model.SensorData;
import com.example.demo.service.SensorDataService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.text.ParseException;
import java.util.List;
import java.util.Optional;


@RestController
@RequestMapping("/sensorData")
public class SensorDataController {

    @Autowired
    private SensorDataService sensorDataService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @PostMapping
    public List<SensorData> addSensorData(@RequestBody List<SensorData> sensorData) {
        List<SensorData> savedData = sensorDataService.saveAll(sensorData);
        // Отправляем обновления через WebSocket
        savedData.forEach(data -> messagingTemplate.convertAndSend("/topic/field-data/" + data.getFieldId(), data));
        return savedData;
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

        // Отправляем обновление через WebSocket
        messagingTemplate.convertAndSend("/topic/field-data/" + updatedSensorData.getFieldId(), updatedSensorData);

        return ResponseEntity.ok(updatedSensorData);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSensorData(@PathVariable String id) {
        try {
            Optional<SensorData> sensorData = sensorDataService.findById(id);
            if (sensorData.isPresent()) {
                sensorDataService.deleteById(id);
                // Отправляем уведомление об удалении через WebSocket
                messagingTemplate.convertAndSend("/topic/field-data/" + sensorData.get().getFieldId(),
                        new DeleteMessage(id));
                return ResponseEntity.ok().build();
            } else {
                return ResponseEntity.notFound().build();
            }
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

    // Класс для сообщения об удалении
    private static class DeleteMessage {
        private String type = "DELETE";
        private String id;

        public DeleteMessage(String id) {
            this.id = id;
        }

        public String getType() {
            return type;
        }

        public String getId() {
            return id;
        }
    }
}