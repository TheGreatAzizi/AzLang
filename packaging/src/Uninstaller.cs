using System;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Windows.Forms;

[assembly: AssemblyTitle("AzLang Uninstall")]
[assembly: AssemblyDescription("AzLang uninstaller")]
[assembly: AssemblyProduct("AzLang")]
[assembly: AssemblyCompany("TheGreatAzizi")]
[assembly: AssemblyCopyright("MIT License")]
[assembly: AssemblyVersion("2.0.0.0")]
[assembly: AssemblyFileVersion("2.0.0.0")]

internal sealed class UninstallForm : Form
{
    private readonly string root;
    private readonly Button removeButton;
    private readonly Button cancelButton;
    private readonly Label statusLabel;
    private readonly ProgressBar progress;
    private bool done;

    public UninstallForm(string root)
    {
        this.root = root;

        Text = "Uninstall AzLang";
        ClientSize = new Size(500, 340);
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        MinimizeBox = false;
        StartPosition = FormStartPosition.CenterScreen;
        Font = new Font("Segoe UI", 9F, FontStyle.Regular, GraphicsUnit.Point);
        BackColor = Color.White;
        AutoScaleMode = AutoScaleMode.Dpi;

        Panel header = new Panel();
        header.Dock = DockStyle.Top;
        header.Height = 92;
        header.BackColor = Color.FromArgb(14, 99, 156);
        Controls.Add(header);

        PictureBox iconBox = new PictureBox();
        iconBox.Location = new Point(24, 20);
        iconBox.Size = new Size(52, 52);
        iconBox.SizeMode = PictureBoxSizeMode.Zoom;
        try
        {
            Icon appIcon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
            if (appIcon != null) iconBox.Image = appIcon.ToBitmap();
        }
        catch { }
        header.Controls.Add(iconBox);

        Label title = new Label();
        title.Text = "Uninstall AzLang";
        title.ForeColor = Color.White;
        title.Font = new Font("Segoe UI Semibold", 17F, FontStyle.Regular, GraphicsUnit.Point);
        title.AutoSize = true;
        title.Location = new Point(92, 20);
        header.Controls.Add(title);

        Label subtitle = new Label();
        subtitle.Text = "Remove the language, Studio, and shortcuts";
        subtitle.ForeColor = Color.FromArgb(214, 235, 248);
        subtitle.AutoSize = true;
        subtitle.Location = new Point(95, 54);
        header.Controls.Add(subtitle);

        Label body = new Label();
        body.Text = "This removes AzLang from this Windows account, including the azlang command, " +
                    "the Studio, Start Menu shortcuts, the PATH entry, and the .az file association.\n\n" +
                    "Your autosaved Studio code in AppData is kept.";
        body.Location = new Point(24, 116);
        body.Size = new Size(452, 74);
        body.ForeColor = Color.FromArgb(60, 60, 60);
        Controls.Add(body);

        Label folder = new Label();
        folder.Text = root;
        folder.Location = new Point(24, 198);
        folder.Size = new Size(452, 20);
        folder.ForeColor = Color.FromArgb(120, 120, 120);
        folder.AutoEllipsis = true;
        Controls.Add(folder);

        statusLabel = new Label();
        statusLabel.Text = "Ready to uninstall.";
        statusLabel.Location = new Point(24, 226);
        statusLabel.Size = new Size(452, 20);
        Controls.Add(statusLabel);

        progress = new ProgressBar();
        progress.Location = new Point(24, 250);
        progress.Size = new Size(452, 8);
        progress.Style = ProgressBarStyle.Continuous;
        Controls.Add(progress);

        removeButton = new Button();
        removeButton.Text = "Uninstall";
        removeButton.Location = new Point(286, 288);
        removeButton.Size = new Size(100, 32);
        removeButton.BackColor = Color.FromArgb(0, 122, 204);
        removeButton.ForeColor = Color.White;
        removeButton.FlatStyle = FlatStyle.Flat;
        removeButton.FlatAppearance.BorderColor = Color.FromArgb(0, 102, 170);
        removeButton.Click += delegate { DoUninstall(); };
        Controls.Add(removeButton);

        cancelButton = new Button();
        cancelButton.Text = "Cancel";
        cancelButton.Location = new Point(396, 288);
        cancelButton.Size = new Size(78, 32);
        cancelButton.DialogResult = DialogResult.Cancel;
        Controls.Add(cancelButton);

        CancelButton = cancelButton;
        AcceptButton = removeButton;
    }

    private void DoUninstall()
    {
        if (done) { Close(); return; }
        if (MessageBox.Show(this, "Uninstall AzLang from this account?", "Uninstall AzLang",
            MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes) return;

        removeButton.Enabled = false;
        cancelButton.Enabled = false;
        progress.Style = ProgressBarStyle.Marquee;
        statusLabel.Text = "Removing AzLang...";
        UseWaitCursor = true;
        Refresh();

        try
        {
            InstallerEngine.Uninstall(root);
            done = true;
            progress.Style = ProgressBarStyle.Continuous;
            progress.Value = 100;
            statusLabel.Text = "AzLang has been removed.";
            MessageBox.Show(this, "AzLang has been removed from this account.",
                "AzLang", MessageBoxButtons.OK, MessageBoxIcon.Information);
            Close();
        }
        catch (Exception error)
        {
            InstallerEngine.WriteErrorLog(error);
            progress.Style = ProgressBarStyle.Continuous;
            progress.Value = 0;
            statusLabel.Text = "Uninstall failed.";
            removeButton.Enabled = true;
            cancelButton.Enabled = true;
            UseWaitCursor = false;
            MessageBox.Show(this, error.Message, "AzLang", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
}

internal static class UninstallerProgram
{
    private static bool Has(string[] args, string name)
    {
        for (int i = 0; i < args.Length; i++)
        {
            if (String.Equals(args[i], name, StringComparison.OrdinalIgnoreCase)) return true;
        }
        return false;
    }

    private static string Value(string[] args, string prefix)
    {
        for (int i = 0; i < args.Length; i++)
        {
            if (args[i].StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            {
                return args[i].Substring(prefix.Length).Trim('"');
            }
        }
        return null;
    }

    [STAThread]
    private static int Main(string[] args)
    {
        string baseDirectory = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\');
        string root = Value(args, "--dir=");
        if (String.IsNullOrEmpty(root))
        {
            if (File.Exists(Path.Combine(baseDirectory, "version.txt"))) root = baseDirectory;
            else root = AzInstall.InstalledLocation();
        }

        if (String.IsNullOrEmpty(root))
        {
            if (!Has(args, "--silent"))
            {
                MessageBox.Show("AzLang does not appear to be installed for this account.",
                    "AzLang", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            return 0;
        }

        if (Has(args, "--silent"))
        {
            try
            {
                InstallerEngine.Uninstall(root);
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
        Application.Run(new UninstallForm(root));
        return 0;
    }
}
