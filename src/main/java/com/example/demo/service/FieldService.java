package com.example.demo.service;

import com.example.demo.model.Field;
import com.example.demo.repository.FieldRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class FieldService {
    @Autowired
    private FieldRepository fieldRepository;

    public List<Field> findAll() {
        return fieldRepository.findAll();
    }

    public Optional<Field> findById(String id) {
        return fieldRepository.findById(id);
    }

    public Field save(Field field) {
        // Добавляем uniqueFieldIdentifier, если его нет
        if (field.getUniqueFieldIdentifier() == null || field.getUniqueFieldIdentifier().isEmpty()) {
            field.setUniqueFieldIdentifier(UUID.randomUUID().toString());
        }
        return fieldRepository.save(field);
    }

    public void deleteById(String id) {
        fieldRepository.deleteById(id);
    }
}