package com.example.demo.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Date;
import java.util.Map;

@Document(collection = "sensorData")
public class SensorData {
    @Id
    private String id;
    private String sensor_id;
    private String field_id;  // Это имя поля в монгодб
    private String uniqueIndex;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", timezone = "UTC")
    private Date timestamp;
    private double value;
    private Map<String, Object> extraParams;

    // Геттеры и сеттеры
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getSensor_id() {
        return sensor_id;
    }

    public void setSensor_id(String sensor_id) {
        this.sensor_id = sensor_id;
    }

    public String getField_id() {
        return field_id;
    }

    public void setField_id(String field_id) {
        this.field_id = field_id;
    }

    // Добавляем геттеры и сеттеры с CamelCase именами для Spring Data
    public String getSensorId() {
        return sensor_id;
    }

    public void setSensorId(String sensorId) {
        this.sensor_id = sensorId;
    }

    public String getFieldId() {
        return field_id;
    }

    public void setFieldId(String fieldId) {
        this.field_id = fieldId;
    }

    public String getUniqueIndex() {
        return uniqueIndex;
    }

    public void setUniqueIndex(String uniqueIndex) {
        this.uniqueIndex = uniqueIndex;
    }

    public Date getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Date timestamp) {
        this.timestamp = timestamp;
    }

    public double getValue() {
        return value;
    }

    public void setValue(double value) {
        this.value = value;
    }

    public Map<String, Object> getExtraParams() {
        return extraParams;
    }

    public void setExtraParams(Map<String, Object> extraParams) {
        this.extraParams = extraParams;
    }
}