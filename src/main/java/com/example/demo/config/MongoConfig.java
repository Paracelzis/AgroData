package com.example.demo.config;

import com.mongodb.MongoClientSettings;
import com.mongodb.client.MongoClients;
import org.bson.Document;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.data.mongodb.MongoDatabaseFactory;
import org.springframework.data.mongodb.config.AbstractMongoClientConfiguration;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.convert.*;
import org.springframework.data.mongodb.core.mapping.MongoMappingContext;
import org.springframework.data.mongodb.core.mapping.event.LoggingEventListener;
import org.springframework.data.mongodb.core.mapping.MongoMappingContext;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Arrays;
import java.util.Date;

@Configuration
public class MongoConfig extends AbstractMongoClientConfiguration {

    @Override
    protected String getDatabaseName() {
        return "AgroDB";
    }

    @Override
    public MongoCustomConversions customConversions() {
        return new MongoCustomConversions(Arrays.asList(
                new DateToZonedDateTimeConverter(),
                new ZonedDateTimeToDateConverter()
        ));
    }

    @Bean
    public MongoTemplate mongoTemplate(MongoDatabaseFactory mongoDatabaseFactory, MappingMongoConverter converter) {
        return new MongoTemplate(mongoDatabaseFactory, converter);
    }

    @Bean
    public MappingMongoConverter mappingMongoConverter(MongoDatabaseFactory factory, MongoCustomConversions conversions, MongoMappingContext context) {
        MappingMongoConverter converter = new MappingMongoConverter(NoOpDbRefResolver.INSTANCE, context);
        converter.setCustomConversions(conversions);
        converter.setTypeMapper(defaultMongoTypeMapper());
        return converter;
    }

    @Bean
    public MongoTypeMapper defaultMongoTypeMapper() {
        return new DefaultMongoTypeMapper(null);
    }

    @Bean
    public LoggingEventListener mongoEventListener() {
        return new LoggingEventListener();
    }

    static class DateToZonedDateTimeConverter implements Converter<Date, ZonedDateTime> {
        @Override
        public ZonedDateTime convert(Date date) {
            return date.toInstant().atZone(ZoneId.systemDefault());
        }
    }

    static class ZonedDateTimeToDateConverter implements Converter<ZonedDateTime, Date> {
        @Override
        public Date convert(ZonedDateTime zonedDateTime) {
            return Date.from(zonedDateTime.toInstant());
        }
    }
}
