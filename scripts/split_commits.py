#!/usr/bin/env python3
import subprocess
import sys
import datetime
import os
import argparse

DEFAULT_TOTAL = 45


def run(cmd, check=True, capture_output=True):
    if isinstance(cmd, str):
        cmd = cmd.split()
    return subprocess.run(cmd, check=check, text=True, capture_output=capture_output)


def get_changed_files():
    """Return list of files changed in working tree vs HEAD plus untracked files."""
    tracked = []
    try:
        r = run(["git", "diff", "--name-only", "HEAD"], check=False)
        tracked = [l for l in r.stdout.splitlines() if l.strip()]
    except Exception:
        tracked = []

    r2 = run(["git", "ls-files", "--others", "--exclude-standard"], check=False)
    untracked = [l for l in r2.stdout.splitlines() if l.strip()]

    files = tracked + [f for f in untracked if f not in tracked]
    return files


def create_branch(name):
    run(["git", "checkout", "-b", name])


def commit_group(group, idx, total):
    if group:
        print(f"Staging {len(group)} files for commit {idx}/{total}")
        run(["git", "add", "--"] + group)
        summary = ", ".join(group[:5]) + ("..." if len(group) > 5 else "")
        msg = f"Split commit {idx}/{total}: {summary}"
        run(["git", "commit", "-m", msg])
    else:
        msg = f"Empty split commit {idx}/{total}"
        run(["git", "commit", "--allow-empty", "-m", msg])


def push_branch(name):
    run(["git", "push", "--set-upstream", "origin", name])


def parse_args():
    p = argparse.ArgumentParser(description="Split current changes into multiple commits and push")
    p.add_argument("--total", type=int, default=DEFAULT_TOTAL, help="Number of commits to create")
    p.add_argument("--target", default=None, help="Target branch name. If omitted uses split-<total>-<timestamp>")
    return p.parse_args()


def main():
    args = parse_args()
    total = args.total
    if total <= 0:
        print("--total must be a positive integer")
        sys.exit(1)

    # try to find repository root
    try:
        rroot = run(["git", "rev-parse", "--show-toplevel"], check=False)
        if rroot.returncode == 0 and rroot.stdout.strip():
            os.chdir(rroot.stdout.strip())
    except Exception:
        # fallback: script parent
        os.chdir(os.path.dirname(os.path.abspath(__file__)) + os.sep + "..")

    print("Repository root:", os.getcwd())

    files = get_changed_files()
    if not files:
        print("لا توجد تغييرات للالتزام بها (لا توجد ملفات معدلة أو جديدة).")
        sys.exit(1)

    timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
    new_branch = args.target if args.target else f"split-{total}-{timestamp}"
    print(f"إنشاء فرع جديد: {new_branch}")
    create_branch(new_branch)

    # Distribute files across groups
    if len(files) >= total:
        groups = [files[i::total] for i in range(total)]
    else:
        groups = [[f] for f in files]
        groups += [[] for _ in range(total - len(groups))]

    try:
        for idx, group in enumerate(groups, start=1):
            print(f"Commit {idx}/{total}: {len(group)} files")
            commit_group(group, idx, total)

        # final status
        r = run(["git", "status", "--porcelain"], check=False)
        if r.stdout.strip():
            print("تحذير: لا يزال هناك تغييرات غير ملتزم بها:")
            print(r.stdout)
        else:
            print("تم إنشاء جميع الالتزامات محليًا.")

        print("دفع الفرع إلى الريموت origin...")
        push_branch(new_branch)
        print("تم الدفع بنجاح إلى origin/" + new_branch)
    except subprocess.CalledProcessError as e:
        print("خطأ أثناء تنفيذ أوامر git:")
        if hasattr(e, 'stdout') and e.stdout:
            print(e.stdout)
        if hasattr(e, 'stderr') and e.stderr:
            print(e.stderr)
        sys.exit(2)


if __name__ == '__main__':
    main()
