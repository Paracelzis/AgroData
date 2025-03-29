package com.example.demo.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Настраиваем брокер сообщений
        config.enableSimpleBroker("/topic"); // Префикс для отправки сообщений клиентам
        config.setApplicationDestinationPrefixes("/app"); // Префикс для обработки сообщений от клиентов
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Регистрируем эндпоинт для подключения клиентов
        registry.addEndpoint("/ws").withSockJS(); // Поддержка SockJS для совместимости
    }
}