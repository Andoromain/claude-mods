/**
 * Programme Python qui affiche une notification et attend qu'on clique dessus : le clic ramène
 * au premier plan la fenêtre de la session (Linux sous X11, bureau qui suit freedesktop).
 *
 * Pourquoi un programme à part : le bureau ne signale le clic qu'à celui qui a envoyé la
 * notification, il faut donc rester connecté. Le programme se dédouble : la première moitié
 * rend la main tout de suite (code 0 quand la notification est partie), la seconde attend le
 * clic ou la fermeture, dix minutes au plus, sans rien écrire.
 * Arguments : titre, texte, numéro de la fenêtre. Texte fixe, rien n'y est inséré.
 */
export const SCRIPT_CLIQUABLE = String.raw`import os, sys

titre, texte, fenetre = sys.argv[1], sys.argv[2], int(sys.argv[3], 16)
lecture, ecriture = os.pipe()
if os.fork():
    os.close(ecriture)
    sys.exit(0 if os.read(lecture, 2) == b'ok' else 1)
os.close(lecture)
os.setsid()
nul = os.open(os.devnull, os.O_RDWR)
for fd in (0, 1, 2):
    os.dup2(nul, fd)

import ctypes
from gi.repository import Gio, GLib

SERVICE, CHEMIN = 'org.freedesktop.Notifications', '/org/freedesktop/Notifications'
bus = Gio.bus_get_sync(Gio.BusType.SESSION, None)
boucle = GLib.MainLoop()
numero = []


def activer():
    x = ctypes.CDLL('libX11.so.6')
    x.XOpenDisplay.restype = ctypes.c_void_p
    x.XDefaultRootWindow.restype = ctypes.c_ulong
    x.XDefaultRootWindow.argtypes = [ctypes.c_void_p]
    x.XInternAtom.restype = ctypes.c_ulong
    x.XInternAtom.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_int]
    x.XSendEvent.argtypes = [ctypes.c_void_p, ctypes.c_ulong, ctypes.c_int, ctypes.c_long, ctypes.c_void_p]
    x.XFlush.argtypes = [ctypes.c_void_p]
    ecran = x.XOpenDisplay(None)
    if not ecran:
        return

    class Message(ctypes.Structure):
        _fields_ = [('type', ctypes.c_int), ('serial', ctypes.c_ulong), ('send_event', ctypes.c_int),
                    ('display', ctypes.c_void_p), ('window', ctypes.c_ulong), ('message_type', ctypes.c_ulong),
                    ('format', ctypes.c_int), ('data', ctypes.c_long * 5), ('marge', ctypes.c_long * 24)]

    m = Message()
    m.type, m.send_event, m.window, m.format = 33, 1, fenetre, 32
    m.message_type = x.XInternAtom(ecran, b'_NET_ACTIVE_WINDOW', 0)
    m.data[0] = 2
    x.XSendEvent(ecran, x.XDefaultRootWindow(ecran), 0, (1 << 20) | (1 << 19), ctypes.byref(m))
    x.XFlush(ecran)


def signal_recu(_bus, _emetteur, _chemin, _interface, nom, parametres, _donnees):
    if not numero or parametres.unpack()[0] != numero[0]:
        return
    if nom == 'ActionInvoked':
        activer()
    boucle.quit()


bus.signal_subscribe(SERVICE, SERVICE, None, CHEMIN, None, Gio.DBusSignalFlags.NONE, signal_recu, None)
reponse = bus.call_sync(
    SERVICE, CHEMIN, SERVICE, 'Notify',
    GLib.Variant('(susssasa{sv}i)', ('Claude Code', 0, 'dialog-information', titre, texte,
                                     ['default', 'Ouvrir'], {'urgency': GLib.Variant('y', 2)}, 0)),
    None, Gio.DBusCallFlags.NONE, 5000, None)
numero.append(reponse.unpack()[0])
os.write(ecriture, b'ok')
os.close(ecriture)
GLib.timeout_add_seconds(600, boucle.quit)
boucle.run()
`
