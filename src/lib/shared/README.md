// Re-export shim: pure, environment-agnostic helpers.
// Existing code keeps importing from the original paths; this index lets new
// code use `@/lib/shared` as a single discovery point without breaking routes.
export { cn } from "@/lib/utils";
