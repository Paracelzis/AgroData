package com.example.demo.controller;

import com.example.demo.model.Field;
import com.example.demo.repository.FieldRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/fields")
public class FieldController {
    @Autowired
    private FieldRepository fieldRepository;

    @GetMapping
    public List<Field> getAllFields() {
        return fieldRepository.findAll();
    }

    @GetMapping("/{id}")
    public Field getFieldById(@PathVariable String id) {
        return fieldRepository.findById(id).orElse(null);
    }

    @PostMapping
    public Field createField(@RequestBody Field field) {
        return fieldRepository.save(field);
    }

    @PutMapping("/{id}")
    public Field updateField(@PathVariable String id, @RequestBody Field field) {
        field.setId(id);
        return fieldRepository.save(field);
    }

    @DeleteMapping("/{id}")
    public void deleteField(@PathVariable String id) {
        fieldRepository.deleteById(id);
    }
}
