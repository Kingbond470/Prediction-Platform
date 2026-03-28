/**
 * Tests for the single-form Signup page
 *
 * Fields: First Name · Phone Number · Username
 * Endpoint: POST /api/auth/register
 * On success: stores userId/username/firstName in localStorage → redirects to "/"
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Next.js navigation mock ───────────────────────────────────────────────────
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: () => null }),
}));

// ── Global fetch mock ─────────────────────────────────────────────────────────
global.fetch = jest.fn();

// ── localStorage mock ─────────────────────────────────────────────────────────
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

import SignupPage from "@/app/signup/page";

function mockRegisterSuccess(userId = "test-user-uuid") {
  (fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ success: true, user_id: userId }),
  });
}

function mockRegisterFailure(error = "Username already taken") {
  (fetch as jest.Mock).mockResolvedValueOnce({
    ok: false,
    json: () => Promise.resolve({ success: false, error }),
  });
}

describe("SignupPage — single-form flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  // ── Rendering ──────────────────────────────────────────────────────────────
  describe("Initial render", () => {
    it("renders First Name, Phone, and Username fields", () => {
      render(<SignupPage />);
      expect(screen.getByPlaceholderText(/e\.g\. ravi/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/98765 43210/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/cricketking99/i)).toBeInTheDocument();
    });

    it("renders the Start Predicting submit button", () => {
      render(<SignupPage />);
      expect(
        screen.getByRole("button", { name: /start predicting/i })
      ).toBeInTheDocument();
    });

    it("shows the no-password footer note", () => {
      render(<SignupPage />);
      expect(screen.getByText(/no password/i)).toBeInTheDocument();
    });
  });

  // ── Validation ─────────────────────────────────────────────────────────────
  describe("Field validation", () => {
    it("shows first name error after blur with invalid value", async () => {
      render(<SignupPage />);
      const nameInput = screen.getByPlaceholderText(/e\.g\. ravi/i);
      await userEvent.type(nameInput, "A");
      await userEvent.tab(); // triggers blur
      await waitFor(() =>
        expect(screen.getByText(/at least 2 characters/i)).toBeInTheDocument()
      );
    });

    it("shows phone error after blur with wrong number of digits", async () => {
      render(<SignupPage />);
      const phoneInput = screen.getByPlaceholderText(/98765 43210/i);
      await userEvent.type(phoneInput, "12345");
      await userEvent.tab();
      await waitFor(() =>
        expect(screen.getByText(/must be exactly 10 digits/i)).toBeInTheDocument()
      );
    });

    it("shows username error after blur with value too short", async () => {
      render(<SignupPage />);
      const usernameInput = screen.getByPlaceholderText(/cricketking99/i);
      await userEvent.type(usernameInput, "ab");
      await userEvent.tab();
      await waitFor(() =>
        expect(screen.getByText(/at least 3 characters/i)).toBeInTheDocument()
      );
    });

    it("does NOT show errors before any field is touched", () => {
      render(<SignupPage />);
      expect(screen.queryByText(/at least/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/required/i)).not.toBeInTheDocument();
    });

    it("shows green checkmark when username is valid", async () => {
      render(<SignupPage />);
      const usernameInput = screen.getByPlaceholderText(/cricketking99/i);
      await userEvent.type(usernameInput, "fanatic99");
      await waitFor(() =>
        expect(screen.getByText("✓")).toBeInTheDocument()
      );
    });
  });

  // ── Successful submission ──────────────────────────────────────────────────
  describe("Successful registration", () => {
    it("stores userId, username and firstName in localStorage on success", async () => {
      mockRegisterSuccess("new-user-123");
      render(<SignupPage />);

      await userEvent.type(screen.getByPlaceholderText(/e\.g\. ravi/i), "Ravi");
      await userEvent.type(screen.getByPlaceholderText(/98765 43210/i), "9876543210");
      await userEvent.type(screen.getByPlaceholderText(/cricketking99/i), "ravi99");
      await userEvent.click(screen.getByRole("button", { name: /start predicting/i }));

      await waitFor(() => {
        expect(localStorageMock.getItem("userId")).toBe("new-user-123");
        expect(localStorageMock.getItem("username")).toBe("ravi99");
        expect(localStorageMock.getItem("firstName")).toBe("Ravi");
      });
    });

    it("redirects to home after successful registration", async () => {
      mockRegisterSuccess();
      render(<SignupPage />);

      await userEvent.type(screen.getByPlaceholderText(/e\.g\. ravi/i), "Ravi");
      await userEvent.type(screen.getByPlaceholderText(/98765 43210/i), "9876543210");
      await userEvent.type(screen.getByPlaceholderText(/cricketking99/i), "ravi99");
      await userEvent.click(screen.getByRole("button", { name: /start predicting/i }));

      await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/"));
    });

    it("calls /api/auth/register with correct payload", async () => {
      mockRegisterSuccess();
      render(<SignupPage />);

      await userEvent.type(screen.getByPlaceholderText(/e\.g\. ravi/i), "Ravi");
      await userEvent.type(screen.getByPlaceholderText(/98765 43210/i), "9876543210");
      await userEvent.type(screen.getByPlaceholderText(/cricketking99/i), "ravi99");
      await userEvent.click(screen.getByRole("button", { name: /start predicting/i }));

      await waitFor(() => expect(fetch).toHaveBeenCalled());

      const [url, options] = (fetch as jest.Mock).mock.calls[0];
      expect(url).toBe("/api/auth/register");
      expect(options.method).toBe("POST");
      const body = JSON.parse(options.body);
      expect(body.phone).toBe("+919876543210");
      expect(body.name).toBe("Ravi");
      expect(body.username).toBe("ravi99");
    });
  });

  // ── Error handling ─────────────────────────────────────────────────────────
  describe("Error handling", () => {
    it("shows server error when registration fails", async () => {
      mockRegisterFailure("Username already taken");
      render(<SignupPage />);

      await userEvent.type(screen.getByPlaceholderText(/e\.g\. ravi/i), "Ravi");
      await userEvent.type(screen.getByPlaceholderText(/98765 43210/i), "9876543210");
      await userEvent.type(screen.getByPlaceholderText(/cricketking99/i), "taken99");
      await userEvent.click(screen.getByRole("button", { name: /start predicting/i }));

      await waitFor(() =>
        expect(screen.getByText(/username already taken/i)).toBeInTheDocument()
      );
    });

    it("shows network error message on fetch failure", async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));
      render(<SignupPage />);

      await userEvent.type(screen.getByPlaceholderText(/e\.g\. ravi/i), "Ravi");
      await userEvent.type(screen.getByPlaceholderText(/98765 43210/i), "9876543210");
      await userEvent.type(screen.getByPlaceholderText(/cricketking99/i), "ravi99");
      await userEvent.click(screen.getByRole("button", { name: /start predicting/i }));

      await waitFor(() =>
        expect(screen.getByText(/network error/i)).toBeInTheDocument()
      );
    });

    it("does not redirect on failure", async () => {
      mockRegisterFailure();
      render(<SignupPage />);

      await userEvent.type(screen.getByPlaceholderText(/e\.g\. ravi/i), "Ravi");
      await userEvent.type(screen.getByPlaceholderText(/98765 43210/i), "9876543210");
      await userEvent.type(screen.getByPlaceholderText(/cricketking99/i), "taken99");
      await userEvent.click(screen.getByRole("button", { name: /start predicting/i }));

      await waitFor(() => expect(fetch).toHaveBeenCalled());
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  // ── Submit guard ───────────────────────────────────────────────────────────
  describe("Submit guard", () => {
    it("does not call fetch if form is invalid", async () => {
      render(<SignupPage />);
      // Only fill partial data
      await userEvent.type(screen.getByPlaceholderText(/e\.g\. ravi/i), "R"); // too short
      await userEvent.click(screen.getByRole("button", { name: /start predicting/i }));

      expect(fetch).not.toHaveBeenCalled();
    });
  });
});
