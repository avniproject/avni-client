#!/usr/bin/env python3
"""Table-driven tests for report.py — the exit code must reflect BOTH gates.

Verdict parity alone is not enough: a sweep that lost images between the phone and the report
still matched every verdict it did compare, and used to print PASS on whatever survived. These
cases pin the join-completeness gate alongside the verdict gate.

Run with the same interpreter that runs report.py (it needs openpyxl):
    tools/edge-model/verify/.venv/bin/python -m unittest discover -s tools/edge-model/verify -p '*_test.py'

No fixture from TANUH is involved — every workbook here is synthesised in a temp dir, so this
runs without a device and without the proprietary data set.
"""
import csv
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from openpyxl import Workbook

REPORT = Path(__file__).resolve().parent / "report.py"
FOLDS = ["model6", "model8", "model8-2"]
XLSX_HEADER = ["Image ID", "True Label", "Probability_model6", "Probability_model8", "Probability_model8-2"]
REFER = (0.9, 0.9, 0.9)        # unanimous-AND above 0.5 → refer
NO_REFER = (0.9, 0.2, 0.9)     # one fold below 0.5 → no refer


def write_xlsx(path, rows):
    wb = Workbook()
    ws = wb.active
    ws.append(XLSX_HEADER)
    for image_id, true_label, probs in rows:
        ws.append([image_id, true_label, *probs])
    wb.save(path)


def write_dev_csv(path, rows):
    with open(path, "w", newline="") as fh:
        writer = csv.writer(fh)
        writer.writerow(["image_id", *FOLDS])
        for image_id, probs in rows:
            writer.writerow([image_id, *probs])


class ReportExitCodeTest(unittest.TestCase):
    def run_report(self, ref_rows, dev_rows, expected_images):
        """Build a fixtures tree + an out dir, run report.py over them, return (exit code, output)."""
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            test_data = tmp / "fixtures" / "tanuh_test_data" / \
                "Data_models_protocol_for_testing_AI_model_integrations" / "Test data"
            test_data.mkdir(parents=True)
            write_xlsx(test_data / "true_label_model_output_probabilities.xlsx", ref_rows)
            out = tmp / "out"
            out.mkdir()
            write_dev_csv(out / "per_model_scores.csv", dev_rows)
            env = {
                **os.environ,
                "TANUH_FIXTURES": str(tmp / "fixtures"),
                "PARITY_OUT_DIR": str(out),
                "PARITY_EXPECTED_IMAGES": str(expected_images),
            }
            proc = subprocess.run([sys.executable, str(REPORT)], env=env,
                                  capture_output=True, text=True)
            return proc.returncode, proc.stdout + proc.stderr

    def test_every_verdict_matches_and_join_is_complete_passes(self):
        ref = [("a", 1, REFER), ("b", 0, NO_REFER), ("c", 1, REFER)]
        dev = [("a", REFER), ("b", NO_REFER), ("c", REFER)]
        code, output = self.run_report(ref, dev, expected_images=3)
        self.assertEqual(code, 0, output)
        self.assertIn("PASS", output)

    def test_one_flipped_verdict_fails(self):
        ref = [("a", 1, REFER), ("b", 0, NO_REFER), ("c", 1, REFER)]
        dev = [("a", REFER), ("b", REFER), ("c", REFER)]   # b now refers; reference says it does not
        code, output = self.run_report(ref, dev, expected_images=3)
        self.assertEqual(code, 1, output)
        self.assertIn("FAIL", output)
        self.assertIn("b", output)

    def test_short_join_fails_even_though_every_compared_verdict_matches(self):
        """The defect this file exists for: 2 of 3 images swept, both matching, used to print PASS."""
        ref = [("a", 1, REFER), ("b", 0, NO_REFER), ("c", 1, REFER)]
        dev = [("a", REFER), ("b", NO_REFER)]              # image c never made it off the phone
        code, output = self.run_report(ref, dev, expected_images=3)
        self.assertEqual(code, 1, output)
        self.assertIn("FAIL", output)

    def test_device_row_absent_from_the_reference_fails(self):
        """A device row that joins to nothing is silently dropped from the denominator otherwise."""
        ref = [("a", 1, REFER), ("b", 0, NO_REFER)]
        dev = [("a", REFER), ("b", NO_REFER), ("stray", REFER)]
        code, output = self.run_report(ref, dev, expected_images=2)
        self.assertEqual(code, 1, output)
        self.assertIn("stray", output)

    def test_reference_row_with_a_blank_score_is_skipped_not_counted_against_the_run(self):
        """The 90th shipped image lacks model6 in the xlsx — skipping it must not fail the run."""
        ref = [("a", 1, REFER), ("b", 0, NO_REFER), ("blank", 1, (None, 0.9, 0.9))]
        dev = [("a", REFER), ("b", NO_REFER), ("blank", REFER)]
        code, output = self.run_report(ref, dev, expected_images=2)
        self.assertEqual(code, 0, output)
        self.assertIn("blank", output)

    def test_reference_rows_with_no_device_score_are_reported(self):
        """The xlsx is a superset of the shipped images, so this reports rather than fails."""
        ref = [("a", 1, REFER), ("b", 0, NO_REFER), ("elsewhere", 1, REFER)]
        dev = [("a", REFER), ("b", NO_REFER)]
        code, output = self.run_report(ref, dev, expected_images=2)
        self.assertEqual(code, 0, output)
        self.assertIn("elsewhere", output)

    def test_expected_image_count_defaults_to_the_89_shipped_with_complete_scores(self):
        report = REPORT.read_text()
        self.assertIn("EXPECTED_IMAGES_DEFAULT = 89", report)


if __name__ == "__main__":
    unittest.main()
