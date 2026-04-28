# Beril Tracker 🍼✨

Beril Tracker is a cross-platform mobile and web application designed for parents to track their baby's daily routines (nursing, bottle feeding, sleep, and diaper changes) in real-time. 

Initially developed as a local Kotlin & SQLite app, the project was migrated to **React Native (Expo)** and **Firebase** to enable real-time data synchronization and seamless cross-device usage (via PWA) on both Android and iOS. Legacy Kotlin data was successfully migrated to Firestore using a custom Node.js script.

## 🚀 Key Features

* **Real-Time Synchronization:** Powered by Firebase Firestore, any data logged by one parent instantly updates across all devices.
* **Cross-Platform:** Native `.apk` build for Android, and PWA (Progressive Web App) support for iOS/Safari with "Add to Home Screen" capability.
* **Detailed Log Management:**
  * **Nursing:** Left/Right side tracking with stopwatch-based duration calculations.
  * **Milk (Bottle):** Volume tracking in milliliters (ml).
  * **Diaper:** Condition-based logging (Lightly Wet, Heavily Wet, Poopy).
  * **Sleep:** Total sleep duration calculated from start and end times.
* **Smart Forecasting (Beril's Algorithm):** Calculates the estimated time for the next feed, current awake window, and recommends the starting side for the next nursing session based on recent data.
* **Development Statistics:** 7-day historical charts for milk/nursing consumption and daily total sleep hour reports.

## 🛠️ Tech Stack

* **Frontend:** React Native, Expo, React Hooks
* **Backend & Database:** Firebase (Firestore)
* **Hosting (Web & PWA):** Firebase Hosting
* **Date/Time Management:** `date-fns`
* **Icons & UI:** `@expo/vector-icons` (MaterialCommunityIcons), `@react-native-community/datetimepicker`
