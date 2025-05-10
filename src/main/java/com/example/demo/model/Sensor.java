package com.example.demo.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import java.util.List;
import java.util.Map;

@Document(collection = "sensors")
public class Sensor {
    @Id
    private String id;

    @Field("field_id")
    private String field_id;

    private String sensorName;
    private String uniqueSensorIdentifier;
    private String accuracyClass;
    private String unit;
    private Map<String, Object> extraParams;
    private List<String> sensorData; // Список идентификаторов данных с датчиков

    // Геттеры и сеттеры
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getField_id() {
        return field_id;
    }

    public void setField_id(String field_id) {
        this.field_id = field_id;
    }

    // Добавляем CamelCase геттеры/сеттеры для поддержки Spring Data
    public String getFieldId() {
        return field_id;
    }

    public void setFieldId(String fieldId) {
        this.field_id = fieldId;
    }

    public String getSensorName() {
        return sensorName;
    }

    public void setSensorName(String sensorName) {
        this.sensorName = sensorName;
    }

    public String getUniqueSensorIdentifier() {
        return uniqueSensorIdentifier;
    }

    public void setUniqueSensorIdentifier(String uniqueSensorIdentifier) {
        this.uniqueSensorIdentifier = uniqueSensorIdentifier;
    }

    public String getAccuracyClass() {
        return accuracyClass;
    }

    public void setAccuracyClass(String accuracyClass) {
        this.accuracyClass = accuracyClass;
    }

    public String getUnit() {
        return unit;
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }

    public Map<String, Object> getExtraParams() {
        return extraParams;
    }

    public void setExtraParams(Map<String, Object> extraParams) {
        this.extraParams = extraParams;
    }

    public List<String> getSensorData() {
        return sensorData;
    }

    public void setSensorData(List<String> sensorData) {
        this.sensorData = sensorData;
    }
}