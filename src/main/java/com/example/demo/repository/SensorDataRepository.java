package com.example.demo.repository;

import com.example.demo.model.SensorData;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.Date;
import java.util.List;

public interface SensorDataRepository extends MongoRepository<SensorData, String> {

    // Используем аннотацию Query для явного указания запроса к MongoDB
    @Query("{ 'sensor_id': ?0 }")
    List<SensorData> findBySensorId(String sensorId);

    @Query("{ 'sensor_id': ?0, 'timestamp': { $gte: ?1, $lte: ?2 } }")
    List<SensorData> findBySensorIdAndTimestampBetween(String sensorId, Date start, Date end);

    @Query("{ 'field_id': ?0, 'sensor_id': ?1, 'timestamp': { $gte: ?2, $lte: ?3 } }")
    List<SensorData> findByFieldIdAndSensorIdAndTimestampBetween(String fieldId, String sensorId, Date start, Date end);

    @Query("{ 'field_id': ?0 }")
    Page<SensorData> findByFieldIdOrderByTimestampDesc(String fieldId, Pageable pageable);

    @Query("{ 'field_id': ?0, $or: [ { 'sensorName': { $regex: ?1, $options: 'i' } }, { 'value': { $regex: ?1, $options: 'i' } } ] }")
    Page<SensorData> findByFieldIdAndSearchText(String fieldId, String searchText, Pageable pageable);

    @Query("{ 'field_id': ?0 }")
    long countByFieldId(String fieldId);
}