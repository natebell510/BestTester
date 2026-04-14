#!/usr/bin/env bash
set -e
echo "Generating Allure report..."
npx allure generate reports/allure-results --clean -o reports/allure-report
echo "Opening Allure report..."
npx allure open reports/allure-report
