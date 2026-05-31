package com.validation.page.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@Configuration
@EntityScan(basePackages = "com.validation.page.entity")
@EnableJpaRepositories(basePackages = "com.validation.page.repository")
public class JpaConfig {

}
