package com.example.demo.repository;

import com.example.demo.model.Field;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;
import java.util.Optional;

public interface FieldRepository extends MongoRepository<Field, String> {
    Optional<Field> findByUniqueFieldIdentifier(String uniqueFieldIdentifier);
}