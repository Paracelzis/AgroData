package com.example.demo.repository;

import com.example.demo.model.SensorData;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Date;
import java.util.List;

public interface SensorDataRepository extends MongoRepository<SensorData, String> {
    List<SensorData> findByFieldIdAndSensorName(String fieldId, String sensorName);
    List<SensorData> findByFieldIdAndSensorNameAndTimestampBetween(String fieldId, String sensorName, Date start, Date end);
    Page<SensorData> findByFieldIdOrderByTimestampDesc(String fieldId, Pageable pageable);
}
