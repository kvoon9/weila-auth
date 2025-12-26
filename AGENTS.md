# Agent Guidelines for kvoon.me

## General Guidelines

When reviewing or modifying code, identify and remove AI-generated patterns that humans wouldn't write:

- **Redundant Comments**: Remove obvious comments like `// Check if user exists` before `if (user)` or `// Return the result`
- **Defensive Checks**: Remove unnecessary null checks, try-catch blocks, or validations that framework/types already handle
- **Type Bypasses**: Replace `any` types used to bypass TypeScript with proper types or type assertions
- **Style Inconsistencies**: Ensure code matches existing file patterns (spacing, naming, structure)
- **Verbose Logic**: Simplify unnecessarily complex conditionals or ternaries
- **Boilerplate**: Remove duplicate error handling, repeated validation patterns, or unnecessary abstractions
