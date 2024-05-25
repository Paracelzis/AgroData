package com.example.demo.repository;

import com.example.demo.model.SensorData;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface SensorDataRepository extends MongoRepository<SensorData, String> {
    List<SensorData> findByFieldIdOrderByTimestampDesc(String fieldId);
    Page<SensorData> findByFieldIdOrderByTimestampDesc(String fieldId, Pageable pageable);
}