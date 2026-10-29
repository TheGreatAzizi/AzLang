using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using Microsoft.Win32;

internal sealed class InstallOptions
{
    public string Directory;
    public bool AddToPath = true;
    public bool Associate = true;
    public bool Shortcuts = true;
    public bool DesktopShortcut = true;
}

internal static class AzInstall
{
    public const string DisplayName = "AzLang";
    public const string DisplayVersion = "2.0.0";
    public const string Publisher = "TheGreatAzizi";
    public const string Website = "https://github.com/TheGreatAzizi/AzLang";
    public const string UninstallKey = @"Software\Microsoft\Windows\CurrentVersion\Uninstall\AzLang";
    public const string SettingsKey = @"Software\AzLang";
    public const string ProgId = "AzLang.Source";

    public static string DefaultDirectory()
    {
        return Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            Path.Combine("Programs", "AzLang"));
    }

    public static string NormalizeDirectory(string directory)
    {
        if (String.IsNullOrEmpty(directory)) throw new ArgumentException("Choose an installation folder.");
        string value = directory.Trim().Trim('"');
        if (value.Length == 0) throw new ArgumentException("Choose an installation folder.");
        value = Path.GetFullPath(Environment.ExpandEnvironmentVariables(value));
        value = value.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        if (value.Length <= 2) throw new ArgumentException("Choose a folder other than the root of a drive.");
        string windows = Environment.GetFolderPath(Environment.SpecialFolder.Windows);
        if (!String.IsNullOrEmpty(windows) &&
            value.StartsWith(windows.TrimEnd('\\') + "\\", StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException("Windows system folders cannot be used as the installation folder.");
        }
        return value;
    }

    public static string BinDirectory(string root) { return Path.Combine(root, "bin"); }
    public static string RuntimeDirectory(string root) { return Path.Combine(root, "runtime"); }
    public static string StudioDirectory(string root) { return Path.Combine(root, "studio"); }
    public static string CliExe(string root) { return Path.Combine(BinDirectory(root), "azlang.exe"); }
    public static string StudioExe(string root) { return Path.Combine(BinDirectory(root), "AzLangStudio.exe"); }
    public static string UninstallerExe(string root) { return Path.Combine(root, "uninstall.exe"); }
    public static string StudioPage(string root) { return Path.Combine(StudioDirectory(root), "ide.html"); }
    public static string DocsPage(string root) { return Path.Combine(StudioDirectory(root), "docs.html"); }

    public static string InstalledLocation()
    {
        try
        {
            using (RegistryKey key = Registry.CurrentUser.OpenSubKey(UninstallKey))
            {
                if (key == null) return null;
                string location = key.GetValue("InstallLocation") as string;
                if (String.IsNullOrEmpty(location)) return null;
                if (!File.Exists(Path.Combine(location, "version.txt"))) return null;
                return location;
            }
        }
        catch
        {
            return null;
        }
    }

    public static bool IsInstalled()
    {
        return InstalledLocation() != null;
    }

    public static string Quote(string value)
    {
        if (String.IsNullOrEmpty(value)) return "\"\"";
        return "\"" + value.Replace("\"", "\\\"") + "\"";
    }

    public static bool AddToUserPath(string directory)
    {
        string normalized = Path.GetFullPath(directory).TrimEnd('\\');
        string current = Environment.GetEnvironmentVariable("Path", EnvironmentVariableTarget.User) ?? "";
        string[] parts = current.Split(new char[] { ';' });
        for (int i = 0; i < parts.Length; i++)
        {
            string entry = parts[i].Trim();
            if (entry.Length == 0) continue;
            string compare = entry.Trim('"').TrimEnd('\\');
            if (String.Equals(compare, normalized, StringComparison.OrdinalIgnoreCase)) return false;
        }

        string updated = current.Length == 0 ? normalized : normalized + ";" + current;
        Environment.SetEnvironmentVariable("Path", updated, EnvironmentVariableTarget.User);
        string processPath = Environment.GetEnvironmentVariable("PATH") ?? "";
        Environment.SetEnvironmentVariable("PATH", normalized + ";" + processPath, EnvironmentVariableTarget.Process);
        BroadcastEnvironmentChange();
        return true;
    }

    public static bool RemoveFromUserPath(string directory)
    {
        string normalized;
        try
        {
            normalized = Path.GetFullPath(directory).TrimEnd('\\');
        }
        catch
        {
            return false;
        }
        string current = Environment.GetEnvironmentVariable("Path", EnvironmentVariableTarget.User) ?? "";
        List<string> entries = new List<string>();
        bool removed = false;
        string[] parts = current.Split(new char[] { ';' });
        for (int i = 0; i < parts.Length; i++)
        {
            string entry = parts[i].Trim();
            if (entry.Length > 0)
            {
                string compare = entry.Trim('"').TrimEnd('\\');
                if (String.Equals(compare, normalized, StringComparison.OrdinalIgnoreCase))
                {
                    removed = true;
                    continue;
                }
            }
            entries.Add(parts[i]);
        }
        if (!removed) return false;
        Environment.SetEnvironmentVariable("Path", String.Join(";", entries.ToArray()), EnvironmentVariableTarget.User);
        BroadcastEnvironmentChange();
        return true;
    }

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    private static extern IntPtr SendMessageTimeout(
        IntPtr hWnd, uint msg, UIntPtr wParam, string lParam,
        uint flags, uint timeout, out UIntPtr result);

    public static void BroadcastEnvironmentChange()
    {
        try
        {
            UIntPtr result;
            SendMessageTimeout((IntPtr)0xffff, 0x001A, UIntPtr.Zero, "Environment", 0x0002, 5000, out result);
        }
        catch
        {
            // A missed broadcast only means new terminals may need to be opened.
        }
    }

    [DllImport("shell32.dll")]
    private static extern void SHChangeNotify(uint eventId, uint flags, IntPtr item1, IntPtr item2);

    public static void NotifyShell()
    {
        try { SHChangeNotify(0x08000000, 0x0000, IntPtr.Zero, IntPtr.Zero); }
        catch { }
    }

    public static void CreateShortcuts(string root, bool desktop)
    {
        string cli = CliExe(root);
        string studio = StudioExe(root);
        string docs = DocsPage(root);
        string uninstaller = UninstallerExe(root);

        string programs = Environment.GetFolderPath(Environment.SpecialFolder.Programs);
        string folder = Path.Combine(programs, "AzLang");
        Directory.CreateDirectory(folder);

        CreateShortcut(Path.Combine(folder, "AzLang Studio.lnk"), studio, "",
            root, "Open the AzLang Studio editor", cli);
        CreateShortcut(Path.Combine(folder, "AzLang Documentation.lnk"), docs, "",
            root, "Read the AzLang language guide", cli);
        CreateShortcut(Path.Combine(folder, "AzLang Command Prompt.lnk"),
            Environment.GetEnvironmentVariable("ComSpec") ?? Path.Combine(Environment.SystemDirectory, "cmd.exe"),
            "/k cd /d \"%USERPROFILE%\"", Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
            "Open a terminal with azlang on the PATH", cli);
        CreateShortcut(Path.Combine(folder, "Uninstall AzLang.lnk"), uninstaller, "",
            root, "Remove AzLang from this account", cli);

        if (desktop)
        {
            string desktopFolder = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
            CreateShortcut(Path.Combine(desktopFolder, "AzLang Studio.lnk"), studio, "",
                root, "Open the AzLang Studio editor", cli);
        }
    }

    public static void CreateShortcut(string path, string target, string arguments,
        string workingDirectory, string description, string icon)
    {
        object shell = null;
        object shortcut = null;
        try
        {
            Type shellType = Type.GetTypeFromProgID("WScript.Shell");
            if (shellType == null) return;
            shell = Activator.CreateInstance(shellType);
            shortcut = shellType.InvokeMember("CreateShortcut", BindingFlags.InvokeMethod,
                null, shell, new object[] { path });
            Type shortcutType = shortcut.GetType();
            shortcutType.InvokeMember("TargetPath", BindingFlags.SetProperty, null, shortcut, new object[] { target });
            shortcutType.InvokeMember("Arguments", BindingFlags.SetProperty, null, shortcut, new object[] { arguments ?? "" });
            shortcutType.InvokeMember("WorkingDirectory", BindingFlags.SetProperty, null, shortcut, new object[] { workingDirectory ?? "" });
            shortcutType.InvokeMember("Description", BindingFlags.SetProperty, null, shortcut, new object[] { description ?? "" });
            shortcutType.InvokeMember("IconLocation", BindingFlags.SetProperty, null, shortcut, new object[] { icon + ",0" });
            shortcutType.InvokeMember("Save", BindingFlags.InvokeMethod, null, shortcut, null);
        }
        catch
        {
            // Shortcuts are helpful, not essential.
        }
        finally
        {
            if (shortcut != null) Marshal.ReleaseComObject(shortcut);
            if (shell != null) Marshal.ReleaseComObject(shell);
        }
    }

    public static void RemoveShortcuts()
    {
        try
        {
            string folder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs), "AzLang");
            if (Directory.Exists(folder)) Directory.Delete(folder, true);
        }
        catch { }
        try
        {
            string desktop = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), "AzLang Studio.lnk");
            if (File.Exists(desktop)) File.Delete(desktop);
        }
        catch { }
    }

    public static void RegisterAssociation(string root)
    {
        string cli = CliExe(root);
        string runner = Path.Combine(BinDirectory(root), "azlang-run.cmd");
        using (RegistryKey classes = Registry.CurrentUser.CreateSubKey(@"Software\Classes"))
        {
            bool hadExtensionKey = false;
            bool hadOpenWith = false;
            using (RegistryKey existing = classes.OpenSubKey(".az"))
            {
                hadExtensionKey = existing != null;
                if (existing != null)
                {
                    using (RegistryKey openWith = existing.OpenSubKey("OpenWithProgids"))
                    {
                        hadOpenWith = openWith != null;
                    }
                }
            }

            string previous = "";
            bool hadPrevious = false;
            using (RegistryKey extension = classes.CreateSubKey(".az"))
            {
                previous = extension.GetValue(null) as string;
                hadPrevious = !String.IsNullOrEmpty(previous);
                using (RegistryKey settings = Registry.CurrentUser.CreateSubKey(SettingsKey))
                {
                    if (!"1".Equals(settings.GetValue("AzAssociation") as string))
                    {
                        settings.SetValue("PreviousAzClass", previous ?? "", RegistryValueKind.String);
                        settings.SetValue("HadPreviousAzClass", hadPrevious ? 1 : 0, RegistryValueKind.DWord);
                        settings.SetValue("HadAzExtensionKey", hadExtensionKey ? 1 : 0, RegistryValueKind.DWord);
                        settings.SetValue("HadAzOpenWith", hadOpenWith ? 1 : 0, RegistryValueKind.DWord);
                    }
                    settings.SetValue("AzAssociation", "1", RegistryValueKind.String);
                }
                extension.SetValue(null, ProgId, RegistryValueKind.String);
                using (RegistryKey openWith = extension.CreateSubKey("OpenWithProgids"))
                {
                    openWith.SetValue(ProgId, new byte[0], RegistryValueKind.Binary);
                }
            }

            using (RegistryKey prog = classes.CreateSubKey(ProgId))
            {
                prog.SetValue(null, "AzLang source file", RegistryValueKind.String);
                prog.SetValue("FriendlyTypeName", "AzLang source file", RegistryValueKind.String);
                using (RegistryKey icon = prog.CreateSubKey("DefaultIcon"))
                {
                    icon.SetValue(null, cli + ",0", RegistryValueKind.String);
                }
                using (RegistryKey command = prog.CreateSubKey(@"shell\open\command"))
                {
                    command.SetValue(null, Quote(runner) + " \"%1\"", RegistryValueKind.String);
                }
            }
        }
        NotifyShell();
    }

    public static void RemoveAssociation()
    {
        try
        {
            string previous = null;
            bool hadPrevious = false;
            bool ours = false;
            bool hadExtensionKey = true;
            bool hadOpenWith = true;
            using (RegistryKey settings = Registry.CurrentUser.OpenSubKey(SettingsKey))
            {
                if (settings != null)
                {
                    ours = "1".Equals(settings.GetValue("AzAssociation") as string);
                    previous = settings.GetValue("PreviousAzClass") as string;
                    object flag = settings.GetValue("HadPreviousAzClass");
                    hadPrevious = flag is int && (int)flag == 1;
                    object extensionFlag = settings.GetValue("HadAzExtensionKey");
                    if (extensionFlag is int) hadExtensionKey = (int)extensionFlag == 1;
                    object openWithFlag = settings.GetValue("HadAzOpenWith");
                    if (openWithFlag is int) hadOpenWith = (int)openWithFlag == 1;
                }
            }

            bool deleteExtension = false;
            using (RegistryKey classes = Registry.CurrentUser.OpenSubKey(@"Software\Classes", true))
            {
                if (classes != null)
                {
                    if (ours)
                    {
                        using (RegistryKey extension = classes.OpenSubKey(".az", true))
                        {
                            if (extension != null)
                            {
                                string current = extension.GetValue(null) as string;
                                if (String.Equals(current, ProgId, StringComparison.OrdinalIgnoreCase))
                                {
                                    if (hadPrevious) extension.SetValue(null, previous ?? "", RegistryValueKind.String);
                                    else extension.DeleteValue("", false);
                                }

                                bool deleteOpenWith = false;
                                using (RegistryKey openWith = extension.OpenSubKey("OpenWithProgids", true))
                                {
                                    if (openWith != null)
                                    {
                                        openWith.DeleteValue(ProgId, false);
                                        deleteOpenWith = !hadOpenWith &&
                                            openWith.ValueCount == 0 && openWith.SubKeyCount == 0;
                                    }
                                }
                                if (deleteOpenWith)
                                {
                                    try { extension.DeleteSubKey("OpenWithProgids", false); } catch { }
                                }

                                if (!hadExtensionKey &&
                                    extension.ValueCount == 0 && extension.SubKeyCount == 0)
                                {
                                    deleteExtension = true;
                                }
                            }
                        }
                        if (deleteExtension)
                        {
                            try { classes.DeleteSubKeyTree(".az", false); } catch { }
                        }
                    }
                    try { classes.DeleteSubKeyTree(ProgId, false); } catch { }
                }
            }

            try { Registry.CurrentUser.DeleteSubKeyTree(SettingsKey, false); } catch { }
            NotifyShell();
        }
        catch
        {
            // Uninstall must continue even if the association cannot be restored.
        }
    }

    public static long DirectorySize(string root)
    {
        long total = 0;
        try
        {
            string[] files = Directory.GetFiles(root, "*", SearchOption.AllDirectories);
            for (int i = 0; i < files.Length; i++)
            {
                try { total += new FileInfo(files[i]).Length; } catch { }
            }
        }
        catch { }
        return total;
    }

    public static void RegisterUninstall(string root)
    {
        using (RegistryKey key = Registry.CurrentUser.CreateSubKey(UninstallKey))
        {
            key.SetValue("DisplayName", "AzLang 2.0", RegistryValueKind.String);
            key.SetValue("DisplayVersion", DisplayVersion, RegistryValueKind.String);
            key.SetValue("Publisher", Publisher, RegistryValueKind.String);
            key.SetValue("InstallLocation", root, RegistryValueKind.String);
            key.SetValue("DisplayIcon", CliExe(root) + ",0", RegistryValueKind.String);
            key.SetValue("URLInfoAbout", Website, RegistryValueKind.String);
            key.SetValue("HelpLink", Website + "#readme", RegistryValueKind.String);
            key.SetValue("UninstallString", Quote(UninstallerExe(root)), RegistryValueKind.String);
            key.SetValue("QuietUninstallString", Quote(UninstallerExe(root)) + " --silent", RegistryValueKind.String);
            key.SetValue("InstallDate", DateTime.Now.ToString("yyyyMMdd"), RegistryValueKind.String);
            key.SetValue("NoModify", 1, RegistryValueKind.DWord);
            key.SetValue("NoRepair", 1, RegistryValueKind.DWord);
            long size = DirectorySize(root) / 1024;
            if (size > Int32.MaxValue) size = Int32.MaxValue;
            key.SetValue("EstimatedSize", (int)size, RegistryValueKind.DWord);
        }
    }

    public static void RemoveUninstall()
    {
        try { Registry.CurrentUser.DeleteSubKeyTree(UninstallKey, false); } catch { }
    }

    public static void ScheduleDirectoryRemoval(string root)
    {
        try
        {
            string command = "ping 127.0.0.1 -n 3 >nul & rmdir /s /q \"" + root + "\"";
            ProcessStartInfo start = new ProcessStartInfo();
            start.FileName = Environment.GetEnvironmentVariable("ComSpec") ?? "cmd.exe";
            start.Arguments = "/d /c " + command;
            start.UseShellExecute = false;
            start.CreateNoWindow = true;
            start.WindowStyle = ProcessWindowStyle.Hidden;
            Process.Start(start);
        }
        catch
        {
            // If delayed deletion fails the user can remove the folder manually.
        }
    }
}
