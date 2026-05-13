/**
 * Ensures the intake payload targets the same service template as the project (when the project has one).
 * Prevents cross-template intake writes when `projects.service_template_id` is set.
 */
export function assertIntakeMatchesProject(
  project: { service_template_id: string | null },
  serviceTemplateId: string
): { ok: true } | { ok: false; status: number; error: string } {
  if (project.service_template_id == null) {
    return { ok: true }
  }
  if (project.service_template_id === serviceTemplateId) {
    return { ok: true }
  }
  return {
    ok: false,
    status: 409,
    error: "Intake form does not match this project's service.",
  }
}
