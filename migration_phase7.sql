-- Phase 7 Migration: Add primary_payload_type to events table for optimization
ALTER TABLE events ADD COLUMN primary_payload_type TEXT;
