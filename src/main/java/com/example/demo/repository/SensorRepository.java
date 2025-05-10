package com.example.demo.repository;

import com.example.demo.model.Sensor;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;
import java.util.Optional;

public interface SensorRepository extends MongoRepository<Sensor, String> {

    // Используем аннотацию Query для явного указания запроса вместо создания запроса по имени метода
    @Query("{ 'field_id': ?0 }")
    List<Sensor> findByFieldId(String fieldId);

    // Используем аннотацию Query для точного указания полей в запросе
    @Query("{ 'field_id': ?0, 'sensorName': ?1 }")
    Optional<Sensor> findByField_idAndSensorName(String fieldId, String sensorName);

    @Query("{ 'uniqueSensorIdentifier': ?0 }")
    Optional<Sensor> findByUniqueSensorIdentifier(String uniqueSensorIdentifier);
}