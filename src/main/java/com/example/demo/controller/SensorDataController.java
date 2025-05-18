package com.example.demo.controller;

import com.example.demo.model.SensorData;
import com.example.demo.service.SensorDataService;
import com.example.demo.service.SensorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.text.ParseException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/sensorData")
public class SensorDataController {

    @Autowired
    private SensorDataService sensorDataService;

    @Autowired
    private SensorService sensorService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @PostMapping
    public List<SensorData> addSensorData(@RequestBody List<SensorData> sensorData) {
        List<SensorData> savedData = sensorDataService.saveAll(sensorData);
        // Отправляем обновления через WebSocket
        savedData.forEach(data ->
                messagingTemplate.convertAndSend("/topic/field-data/" + data.getField_id(), data));
        return savedData;
    }

    @GetMapping("/field/{fieldId}/count")
    public ResponseEntity<Long> getFieldSensorDataCount(@PathVariable String fieldId) {
        try {
            long count = sensorDataService.countByFieldId(fieldId);
            return ResponseEntity.ok(count);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/field/{fieldId}")
    public ResponseEntity<Map<String, Object>> getFieldSensorData(
            @PathVariable String fieldId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        try {
            Pageable pageable = PageRequest.of(page, size);
            Page<SensorData> pageData = sensorDataService.findByFieldIdOrderByTimestampDesc(fieldId, pageable);

            Map<String, Object> response = new HashMap<>();
            response.put("content", pageData.getContent());
            response.put("totalPages", pageData.getTotalPages());
            response.put("totalElements", pageData.getTotalElements());
            response.put("currentPage", pageData.getNumber());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
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
        messagingTemplate.convertAndSend("/topic/field-data/" + updatedSensorData.getField_id(), updatedSensorData);

        return ResponseEntity.ok(updatedSensorData);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSensorData(@PathVariable String id) {
        try {
            Optional<SensorData> sensorData = sensorDataService.findById(id);
            if (sensorData.isPresent()) {
                sensorDataService.deleteById(id);
                // Отправляем уведомление об удалении через WebSocket
                messagingTemplate.convertAndSend("/topic/field-data/" + sensorData.get().getField_id(),
                        new DeleteMessage(id));
                return ResponseEntity.ok().build();
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{fieldId}/{sensorId}")
    public List<SensorData> getSensorData(
            @PathVariable String fieldId,
            @PathVariable String sensorId,
            @RequestParam String start,
            @RequestParam String end) throws ParseException {
        return sensorDataService.getSensorData(fieldId, sensorId, start, end);
    }

    @GetMapping("/{fieldId}/{sensorId}/all")
    public List<SensorData> getAllTimeSensorData(
            @PathVariable String fieldId,
            @PathVariable String sensorId) {
        return sensorDataService.getAllTimeSensorData(fieldId, sensorId);
    }

    @GetMapping("/api/sensorData/paginated")
    public ResponseEntity<Page<SensorData>> getPaginatedSensorData(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam String fieldId,
            @RequestParam(required = false) String search) {

        try {
            Pageable pageable = PageRequest.of(page, size);
            Page<SensorData> result;

            if (search != null && !search.trim().isEmpty()) {
                // Если есть поисковый запрос, использовать метод поиска
                result = sensorDataService.findByFieldIdAndSearchText(fieldId, search, pageable);
            } else {
                // Иначе использовать обычный метод получения данных по полю
                result = sensorDataService.findByFieldIdOrderByTimestampDesc(fieldId, pageable);
            }

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
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