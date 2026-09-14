/**
 * Component test skeleton for the Profile screen.
 *
 * Verifies the core validation behavior (FR-006): the validation message
 * appears when the user tries to continue with an empty profile.
 */
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProfilePage } from "../pages/ProfilePage";
import { SessionProvider } from "../state/SessionContext";
import { PROFILE_REQUIRED_MESSAGE } from "@food-signal/shared";

function renderProfile() {
  return render(
    <SessionProvider>
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    </SessionProvider>,
  );
}

describe("ProfilePage", () => {
  it("shows a validation message when continuing with no input", () => {
    renderProfile();
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(PROFILE_REQUIRED_MESSAGE);
  });

  // TODO: add a test that navigates to /menu after a valid allergy is entered
  // (requires a router spy or a test harness that observes navigation).
});
