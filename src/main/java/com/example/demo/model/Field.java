package com.example.demo.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.List;
import java.util.Map;

@Document(collection = "fields")
public class Field {
    @Id
    private String id;
    private String fieldName;
    private String uniqueFieldIdentifier;
    private Map<String, Object> extraParams;
    private List<String> sensors; // Список идентификаторов датчиков

    // Геттеры и сеттеры
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getFieldName() {
        return fieldName;
    }

    public void setFieldName(String fieldName) {
        this.fieldName = fieldName;
    }

    public String getUniqueFieldIdentifier() {
        return uniqueFieldIdentifier;
    }

    public void setUniqueFieldIdentifier(String uniqueFieldIdentifier) {
        this.uniqueFieldIdentifier = uniqueFieldIdentifier;
    }

    public Map<String, Object> getExtraParams() {
        return extraParams;
    }

    public void setExtraParams(Map<String, Object> extraParams) {
        this.extraParams = extraParams;
    }

    public List<String> getSensors() {
        return sensors;
    }

    public void setSensors(List<String> sensors) {
        this.sensors = sensors;
    }
}