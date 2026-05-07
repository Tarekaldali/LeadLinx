#!/usr/bin/env python3
import subprocess
import sys
import datetime
import os

TOTAL = 45

def run(cmd, check=True, capture_output=True):
    if isinstance(cmd, str):
        cmd = cmd.split()
    return subprocess.run(cmd, check=check, text=True, capture_output=capture_output)

def get_changed_files():
    # Tracked files changed vs HEAD
    try:
        r = run(["git", "diff", "--name-only", "HEAD"])
        tracked = [l for l in r.stdout.splitlines() if l.strip()]
    except subprocess.CalledProcessError:
        tracked = []
    # Untracked files
    r2 = run(["git", "ls-files", "--others", "--exclude-standard"])
    untracked = [l for l in r2.stdout.splitlines() if l.strip()]
    # Combine keeping tracked first
    files = tracked + [f for f in untracked if f not in tracked]
    return files

def get_current_branch():
    r = run(["git", "rev-parse", "--abbrev-ref", "HEAD"])
    return r.stdout.strip()

def create_branch(name):
    run(["git", "checkout", "-b", name])

def commit_group(group, idx):
    if group:
        print(f"Staging {len(group)} files for commit {idx}/{TOTAL}")
        run(["git", "add", "--"] + group)
        summary = ", ".join(group[:5]) + ("..." if len(group)>5 else "")
        msg = f"Split commit {idx}/{TOTAL}: {summary}"
        run(["git", "commit", "-m", msg])
    else:
        msg = f"Empty split commit {idx}/{TOTAL}"
        run(["git", "commit", "--allow-empty", "-m", msg])

def push_branch(name):
    run(["git", "push", "--set-upstream", "origin", name])

def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)) + os.sep + '..')
    os.chdir(os.getcwd())
    print("Repository root:", os.getcwd())

    files = get_changed_files()
    if not files:
        print("لا توجد تغييرات للالتزام بها (لا توجد ملفات معدلة أو جديدة).")
        sys.exit(1)

    timestamp = datetime.datetime.now().strftime('%Y%m%d%H%M%S')
    new_branch = f"split-45-{timestamp}"
    print(f"إنشاء فرع جديد: {new_branch}")
    create_branch(new_branch)

    # Distribute files across TOTAL groups
    if len(files) >= TOTAL:
        groups = [files[i::TOTAL] for i in range(TOTAL)]
    else:
        groups = [[f] for f in files]
        # pad with empty groups
        groups += [[] for _ in range(TOTAL - len(groups))]

    try:
        for idx, group in enumerate(groups, start=1):
            print(f"Commit {idx}/{TOTAL}: {len(group)} files")
            commit_group(group, idx)

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
        if e.stdout:
            print(e.stdout)
        if e.stderr:
            print(e.stderr)
        sys.exit(2)

if __name__ == '__main__':
    main()
