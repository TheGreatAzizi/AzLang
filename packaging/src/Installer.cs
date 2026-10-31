using System;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Text;
using System.Threading;
using System.Windows.Forms;

[assembly: AssemblyTitle("AzLang Setup")]
[assembly: AssemblyDescription("AzLang installer")]
[assembly: AssemblyProduct("AzLang")]
[assembly: AssemblyCompany("TheGreatAzizi")]
[assembly: AssemblyCopyright("MIT License")]
[assembly: AssemblyVersion("2.1.0.0")]
[assembly: AssemblyFileVersion("2.1.0.0")]

internal sealed class InstallerForm : Form
{
    private readonly TextBox folderBox;
    private readonly CheckBox pathCheck;
    private readonly CheckBox associationCheck;
    private readonly CheckBox shortcutCheck;
    private readonly CheckBox launchCheck;
    private readonly Button installButton;
    private readonly Button uninstallButton;
    private readonly Label statusLabel;
    private readonly ProgressBar progress;
    private readonly bool existingInstall;
    private bool installed;

    public InstallerForm()
    {
        string existing = AzInstall.InstalledLocation();
        existingInstall = existing != null;
        string target = existing ?? AzInstall.DefaultDirectory();

        Text = "AzLang " + AzInstall.DisplayVersion + " Setup";
        ClientSize = new Size(640, 520);
        MinimumSize = new Size(640, 520);
        MaximumSize = new Size(640, 520);
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        MinimizeBox = false;
        StartPosition = FormStartPosition.CenterScreen;
        Font = new Font("Segoe UI", 9F, FontStyle.Regular, GraphicsUnit.Point);
        BackColor = Color.White;
        AutoScaleMode = AutoScaleMode.Dpi;

        Panel header = new Panel();
        header.Dock = DockStyle.Top;
        header.Height = 106;
        header.BackColor = Color.FromArgb(14, 99, 156);
        Controls.Add(header);

        PictureBox iconBox = new PictureBox();
        iconBox.Location = new Point(24, 24);
        iconBox.Size = new Size(56, 56);
        iconBox.SizeMode = PictureBoxSizeMode.Zoom;
        try
        {
            Icon appIcon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
            if (appIcon != null) iconBox.Image = appIcon.ToBitmap();
        }
        catch { }
        header.Controls.Add(iconBox);

        Label title = new Label();
        title.Text = "AzLang " + AzInstall.DisplayVersion;
        title.ForeColor = Color.White;
        title.Font = new Font("Segoe UI Semibold", 20F, FontStyle.Regular, GraphicsUnit.Point);
        title.AutoSize = true;
        title.Location = new Point(96, 22);
        header.Controls.Add(title);

        Label subtitle = new Label();
        subtitle.Text = "A small language with serious features";
        subtitle.ForeColor = Color.FromArgb(214, 235, 248);
        subtitle.Font = new Font("Segoe UI", 9.5F, FontStyle.Regular, GraphicsUnit.Point);
        subtitle.AutoSize = true;
        subtitle.Location = new Point(99, 60);
        header.Controls.Add(subtitle);

        Label badge = new Label();
        badge.Text = "Windows x64";
        badge.ForeColor = Color.White;
        badge.BackColor = Color.FromArgb(38, 128, 185);
        badge.Font = new Font("Segoe UI", 8F, FontStyle.Regular, GraphicsUnit.Point);
        badge.TextAlign = ContentAlignment.MiddleCenter;
        badge.Location = new Point(532, 28);
        badge.Size = new Size(82, 22);
        header.Controls.Add(badge);

        Label intro = new Label();
        intro.Text = existingInstall
            ? "AzLang is already installed. Setup will update it in place."
            : "Install the AzLang command line, the browser-based Studio, and the complete language guide. No administrator rights are required.";
        intro.Location = new Point(24, 124);
        intro.Size = new Size(592, 38);
        intro.ForeColor = Color.FromArgb(60, 60, 60);
        Controls.Add(intro);

        Label folderLabel = new Label();
        folderLabel.Text = "Install location";
        folderLabel.Location = new Point(24, 174);
        folderLabel.AutoSize = true;
        folderLabel.ForeColor = Color.FromArgb(40, 40, 40);
        Controls.Add(folderLabel);

        folderBox = new TextBox();
        folderBox.Location = new Point(24, 196);
        folderBox.Size = new Size(496, 26);
        folderBox.Text = target;
        Controls.Add(folderBox);

        Button browse = new Button();
        browse.Text = "Browse...";
        browse.Location = new Point(528, 194);
        browse.Size = new Size(88, 28);
        browse.Click += delegate
        {
            using (FolderBrowserDialog dialog = new FolderBrowserDialog())
            {
                dialog.Description = "Choose where AzLang should be installed";
                dialog.SelectedPath = folderBox.Text;
                if (dialog.ShowDialog(this) == DialogResult.OK) folderBox.Text = dialog.SelectedPath;
            }
        };
        Controls.Add(browse);

        pathCheck = new CheckBox();
        pathCheck.Text = "Add azlang to my PATH (usable from any terminal)";
        pathCheck.Location = new Point(27, 240);
        pathCheck.AutoSize = true;
        pathCheck.Checked = true;
        Controls.Add(pathCheck);

        associationCheck = new CheckBox();
        associationCheck.Text = "Open .az files with AzLang";
        associationCheck.Location = new Point(27, 266);
        associationCheck.AutoSize = true;
        associationCheck.Checked = true;
        Controls.Add(associationCheck);

        shortcutCheck = new CheckBox();
        shortcutCheck.Text = "Create Start Menu and desktop shortcuts";
        shortcutCheck.Location = new Point(27, 292);
        shortcutCheck.AutoSize = true;
        shortcutCheck.Checked = true;
        Controls.Add(shortcutCheck);

        Label note = new Label();
        note.Text = "Includes its own Node.js runtime, so azlang works without installing anything else. " +
                    "AzLang never sends your code anywhere.";
        note.Location = new Point(24, 330);
        note.Size = new Size(592, 34);
        note.ForeColor = Color.FromArgb(110, 110, 110);
        Controls.Add(note);

        statusLabel = new Label();
        statusLabel.Text = "Ready to install.";
        statusLabel.Location = new Point(24, 372);
        statusLabel.Size = new Size(592, 20);
        statusLabel.ForeColor = Color.FromArgb(70, 70, 70);
        Controls.Add(statusLabel);

        progress = new ProgressBar();
        progress.Location = new Point(24, 396);
        progress.Size = new Size(592, 8);
        progress.Style = ProgressBarStyle.Continuous;
        progress.Value = 0;
        Controls.Add(progress);

        launchCheck = new CheckBox();
        launchCheck.Text = "Launch AzLang Studio";
        launchCheck.Location = new Point(24, 462);
        launchCheck.AutoSize = true;
        launchCheck.Checked = true;
        Controls.Add(launchCheck);

        uninstallButton = new Button();
        uninstallButton.Text = "Uninstall";
        uninstallButton.Location = new Point(244, 456);
        uninstallButton.Size = new Size(88, 30);
        uninstallButton.Visible = existingInstall;
        uninstallButton.Click += delegate { UninstallExisting(); };
        Controls.Add(uninstallButton);

        installButton = new Button();
        installButton.Text = existingInstall ? "Update" : "Install";
        installButton.Location = new Point(434, 454);
        installButton.Size = new Size(104, 32);
        installButton.BackColor = Color.FromArgb(0, 122, 204);
        installButton.ForeColor = Color.White;
        installButton.FlatStyle = FlatStyle.Flat;
        installButton.FlatAppearance.BorderColor = Color.FromArgb(0, 102, 170);
        installButton.Click += delegate { StartInstall(); };
        Controls.Add(installButton);

        Button cancel = new Button();
        cancel.Text = "Cancel";
        cancel.Location = new Point(546, 454);
        cancel.Size = new Size(70, 32);
        cancel.DialogResult = DialogResult.Cancel;
        Controls.Add(cancel);

        CancelButton = cancel;
        AcceptButton = installButton;

        if (existingInstall)
        {
            folderBox.ReadOnly = true;
            folderBox.BackColor = Color.FromArgb(245, 245, 245);
            browse.Enabled = false;
        }
    }

    private void UninstallExisting()
    {
        string root = AzInstall.InstalledLocation();
        if (root == null) return;
        if (MessageBox.Show(this, "Uninstall AzLang from this account?", "Uninstall AzLang",
            MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes) return;
        string uninstaller = AzInstall.UninstallerExe(root);
        if (!File.Exists(uninstaller))
        {
            MessageBox.Show(this, "The uninstaller is missing. Remove the folder manually:\n\n" + root,
                "AzLang", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return;
        }
        try
        {
            System.Diagnostics.Process.Start(uninstaller);
            Close();
        }
        catch (Exception error)
        {
            MessageBox.Show(this, error.Message, "AzLang", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    private void StartInstall()
    {
        if (installed)
        {
            Close();
            return;
        }

        InstallOptions options = new InstallOptions();
        options.Directory = folderBox.Text;
        options.AddToPath = pathCheck.Checked;
        options.Associate = associationCheck.Checked;
        options.Shortcuts = shortcutCheck.Checked;
        options.DesktopShortcut = shortcutCheck.Checked;

        installButton.Enabled = false;
        uninstallButton.Enabled = false;
        folderBox.Enabled = false;
        pathCheck.Enabled = false;
        associationCheck.Enabled = false;
        shortcutCheck.Enabled = false;
        progress.Style = ProgressBarStyle.Marquee;
        statusLabel.Text = "Installing AzLang...";
        Cursor = Cursors.WaitCursor;
        UseWaitCursor = true;
        Refresh();

        try
        {
            InstallerEngine.Install(options);
            progress.Style = ProgressBarStyle.Continuous;
            progress.Value = 100;
            statusLabel.Text = "AzLang is installed.";
            installButton.Text = "Close";
            installButton.Enabled = true;
            installed = true;
            Cursor = Cursors.Default;
            UseWaitCursor = false;

            if (launchCheck.Checked)
            {
                try { InstallerEngine.LaunchStudio(options.Directory); }
                catch (Exception error)
                {
                    MessageBox.Show(this, "AzLang was installed, but the Studio could not start:\n\n" + error.Message,
                        "AzLang", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                }
            }
            if (launchCheck.Checked) Close();
        }
        catch (Exception error)
        {
            progress.Style = ProgressBarStyle.Continuous;
            progress.Value = 0;
            statusLabel.Text = "Installation failed.";
            installButton.Enabled = true;
            uninstallButton.Enabled = true;
            folderBox.Enabled = true;
            pathCheck.Enabled = true;
            associationCheck.Enabled = true;
            shortcutCheck.Enabled = true;
            Cursor = Cursors.Default;
            UseWaitCursor = false;
            InstallerEngine.WriteErrorLog(error);
            MessageBox.Show(this,
                error.Message + "\n\nDetails were written to:\n" +
                Path.Combine(Path.GetTempPath(), "AzLang-setup-error.log"),
                "AzLang Setup", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
}

internal static class InstallerProgram
{
    private static bool Has(string[] args, string name)
    {
        for (int i = 0; i < args.Length; i++)
        {
            if (String.Equals(args[i], name, StringComparison.OrdinalIgnoreCase)) return true;
        }
        return false;
    }

    private static string Value(string[] args, string prefix, string fallback)
    {
        for (int i = 0; i < args.Length; i++)
        {
            if (args[i].StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            {
                return args[i].Substring(prefix.Length).Trim('"');
            }
        }
        return fallback;
    }

    [STAThread]
    private static int Main(string[] args)
    {
        bool silent = Has(args, "--silent") || Has(args, "/s") || Has(args, "/silent");
        string directory = Value(args, "--dir=", null);

        if (silent)
        {
            try
            {
                InstallOptions options = new InstallOptions();
                options.Directory = directory ?? AzInstall.DefaultDirectory();
                options.AddToPath = !Has(args, "--no-path");
                options.Associate = !Has(args, "--no-assoc");
                options.Shortcuts = !Has(args, "--no-shortcuts");
                options.DesktopShortcut = !Has(args, "--no-desktop");
                InstallerEngine.Install(options);
                return 0;
            }
            catch (Exception error)
            {
                InstallerEngine.WriteErrorLog(error);
                return 1;
            }
        }

        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        InstallerForm form = new InstallerForm();
        if (!String.IsNullOrEmpty(directory)) form.Text = "AzLang " + AzInstall.DisplayVersion + " Setup";
        Application.Run(form);
        return 0;
    }
}
