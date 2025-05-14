package com.example.demo.controller;

import com.example.demo.model.Field;
import com.example.demo.model.Sensor;
import com.example.demo.service.FieldService;
import com.example.demo.service.SensorService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/fields")
public class FieldController {
    @Autowired
    private FieldService fieldService;

    @Autowired
    private SensorService sensorService;

    @GetMapping
    public List<Field> getAllFields() {
        return fieldService.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Field> getFieldById(@PathVariable String id) {
        return fieldService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Обработка создания поля с датчиками
    @PostMapping
    public ResponseEntity<Field> createField(@RequestBody Map<String, Object> request) {
        // Извлекаем данные из запроса
        String fieldName = (String) request.get("fieldName");
        List<Map<String, Object>> sensorsData = (List<Map<String, Object>>) request.get("sensors");

        // Создаем новое поле
        Field field = new Field();
        field.setFieldName(fieldName);
        field.setUniqueFieldIdentifier(UUID.randomUUID().toString());
        field.setSensors(new ArrayList<>());

        // Добавляем extraParams, если они есть
        if (request.containsKey("extraParams")) {
            field.setExtraParams((Map<String, Object>) request.get("extraParams"));
        }

        // Сохраняем поле для получения ID
        Field savedField = fieldService.save(field);

        // Создаем и сохраняем датчики, связанные с полем
        List<Sensor> sensors = new ArrayList<>();
        for (Map<String, Object> sensorData : sensorsData) {
            Sensor sensor = new Sensor();
            sensor.setField_id(savedField.getId());
            sensor.setSensorName((String) sensorData.get("sensorName"));
            sensor.setUniqueSensorIdentifier(UUID.randomUUID().toString());

            // Добавляем дополнительные поля, если они указаны
            if (sensorData.containsKey("unit")) {
                sensor.setUnit((String) sensorData.get("unit"));
            }
            if (sensorData.containsKey("accuracyClass")) {
                sensor.setAccuracyClass((String) sensorData.get("accuracyClass"));
            }
            if (sensorData.containsKey("extraParams")) {
                sensor.setExtraParams((Map<String, Object>) sensorData.get("extraParams"));
            }

            sensors.add(sensor);
        }

        // Сохраняем датчики
        List<Sensor> savedSensors = sensorService.saveAll(sensors);

        // Обновляем поле с ID датчиков
        savedField.setSensors(savedSensors.stream().map(Sensor::getId).collect(Collectors.toList()));
        fieldService.save(savedField);

        return ResponseEntity.ok(savedField);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Field> updateField(@PathVariable String id, @RequestBody Map<String, Object> request) {
        return fieldService.findById(id)
                .map(existingField -> {
                    // Обновляем поле
                    String fieldName = (String) request.get("fieldName");
                    existingField.setFieldName(fieldName);

                    // Обновляем extraParams, если они есть
                    if (request.containsKey("extraParams")) {
                        // Проверяем тип extraParams
                        Object extraParams = request.get("extraParams");
                        if (extraParams instanceof Map) {
                            // Если это Map, то устанавливаем
                            @SuppressWarnings("unchecked")
                            Map<String, Object> extraParamsMap = (Map<String, Object>) extraParams;
                            existingField.setExtraParams(extraParamsMap);
                        } else if (extraParams instanceof String) {
                            // Если это String, то нужно преобразовать в Map
                            // Возможно, это JSON-строка
                            try {
                                ObjectMapper mapper = new ObjectMapper();
                                @SuppressWarnings("unchecked")
                                Map<String, Object> extraParamsMap = mapper.readValue((String) extraParams, Map.class);
                                existingField.setExtraParams(extraParamsMap);
                            } catch (Exception e) {
                                // Если не удалось преобразовать, оставляем как есть или устанавливаем null
                                existingField.setExtraParams(null);
                            }
                        } else if (extraParams == null) {
                            existingField.setExtraParams(null);
                        }
                    }

                    // Обрабатываем датчики
                    // ... остальной код без изменений ...

                    return ResponseEntity.ok(fieldService.save(existingField));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteField(@PathVariable String id) {
        return fieldService.findById(id)
                .map(field -> {
                    // Удаляем связанные датчики
                    List<Sensor> sensors = sensorService.findByFieldId(id);
                    sensors.forEach(sensor -> sensorService.deleteById(sensor.getId()));

                    // Удаляем само поле
                    fieldService.deleteById(id);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}